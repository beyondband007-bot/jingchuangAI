import { randomUUID } from 'crypto'
import { getPool } from '../../db/pool.js'
import {
  extractResultUrls,
  getKieTask,
  mapKieState,
} from '../../providers/kie/client.js'
import { createKieImageTask } from '../../providers/kie/image.js'
import { uploadFileToKie } from '../../providers/kie/upload.js'
import { debitCredits, refundCredits } from '../../shared/creditService.js'
import {
  persistGeneratedImages,
  removeStoredGeneratedImages,
} from '../../shared/generatedImageStorage.js'
import { createHttpError } from '../../shared/http.js'
import { getUserCredits } from '../../shared/userService.js'
import { calculateImagePoints } from '../../shared/billingRules.js'
import { mapImageTask } from './image.mapper.js'
import {
  createImageTask,
  assignImageTasksThread,
  deleteImageTask,
  findEnabledImageModels,
  findImageModelPrice,
  findImageTaskRow,
  findImageTaskStatus,
  findRefreshableImageTasks,
  findInspirationFavorite,
  listInspirationFavorites as listInspirationFavoriteEntries,
  listImageTaskRows,
  lockImageTaskForRefund,
  addInspirationFavorite,
  markImageTaskRefunded,
  removeInspirationFavorite,
  setImageTaskCompleted,
  setImageTaskError,
  setImageTaskFailed,
  setImageTaskProcessing,
  setImageTaskProviderTaskId,
  toggleImageTaskFavorite,
} from './image.repository.js'
import {
  gptImage2ImageToImageModelKey,
  gptImage2ModelKey,
  imageCountOptions,
  imageQualityOptions,
  imageRatioOptions,
  qualityMultiplier,
  validateImagePayload,
} from './image.options.js'

const hiddenImageModelKeys = new Set([
  gptImage2ImageToImageModelKey,
  'gpt_image_1_5_i2i',
])

function normalizeThreadId(value) {
  const threadId = typeof value === 'string' ? value.trim() : ''
  if (!threadId) return `image-thread-${Date.now()}-${randomUUID().slice(0, 8)}`
  return threadId.slice(0, 80)
}

function normalizeContextTaskIds(value) {
  if (!Array.isArray(value)) return []
  return [
    ...new Set(
      value
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ]
}

function normalizeReferenceImageUrls(payload = {}) {
  const values = []
  const push = (value) => {
    const text = typeof value === 'string' ? value.trim() : ''
    if (text) values.push(text)
  }
  push(payload.referenceImageUrl)
  if (Array.isArray(payload.referenceImageUrls)) {
    payload.referenceImageUrls.forEach(push)
  }
  return [...new Set(values)].slice(0, 6)
}

export async function getCredits(userId) {
  return getUserCredits(userId)
}

export async function getModels() {
  const models = await findEnabledImageModels()
  return {
    models: models.filter((model) => !hiddenImageModelKeys.has(model.value)),
    ratios: imageRatioOptions,
    qualities: imageQualityOptions,
    counts: imageCountOptions,
  }
}
export async function uploadReferenceImage({ file }) {
  if (!file) {
    throw createHttpError('file is required', 400)
  }
  const upload = await uploadFileToKie({
    filePath: file.path,
    fileName: file.filename || file.originalname || 'reference-image',
    mimeType: file.mimetype || 'application/octet-stream',
    uploadPath: 'image-generation',
  })

  return {
    url: upload.url,
    referenceImageUrl: upload.url,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  }
}

export async function listTasks({ userId, filter = 'all', source } = {}) {
  await recoverProcessingImageTasks()
  const rows = await listImageTaskRows({ userId, filter, source })
  return rows.map(mapImageTask)
}

export async function getTask(id, userId) {
  await refreshTask(id)
  const row = await findImageTaskRow(id, userId)
  return row ? mapImageTask(row) : null
}

export async function createTask(payload, userId) {
  const { prompt, ratio, quality, count = 1, source } = payload
  const referenceImageUrls = normalizeReferenceImageUrls(payload)
  const referenceImageUrl = referenceImageUrls[0] || ''
  const threadId = normalizeThreadId(payload.threadId)
  const contextTaskIds = normalizeContextTaskIds(payload.contextTaskIds)
  const requestedModel = payload.model
  const fallbackModel =
    typeof payload.fallbackModel === 'string' ? payload.fallbackModel.trim() : ''
  validateImagePayload({
    prompt,
    model: requestedModel,
    ratio,
    quality,
    count,
    referenceImageUrl,
  })
  const model =
    referenceImageUrl && requestedModel === gptImage2ModelKey
      ? gptImage2ImageToImageModelKey
      : requestedModel

  const pool = getPool()
  const connection = await pool.getConnection()
  let taskId
  let costPoints

  try {
    await connection.beginTransaction()
    let modelPrice = await findImageModelPrice(connection, model)
    if (!modelPrice && model === gptImage2ImageToImageModelKey) {
      modelPrice = await findImageModelPrice(connection, 'gpt_image_2')
    }
    if (!modelPrice) {
      throw createHttpError('model not found', 400)
    }

    costPoints = calculateImagePoints(count)
    taskId = await createImageTask(connection, {
      userId,
      modelKey: model,
      prompt: prompt.trim(),
      ratio,
      quality,
      count: Number(count),
      costPoints,
      source,
      threadId,
      referenceImageUrl: referenceImageUrl || null,
    })

    await assignImageTasksThread(connection, {
      userId,
      taskIds: [...contextTaskIds, taskId],
      threadId,
    })

    await debitCredits(connection, {
      userId,
      taskId,
      amount: costPoints,
      memo: 'image generation debit',
    })

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    connection.release()
    throw error
  }

  connection.release()

  try {
    let provider
    let providerModel = model
    try {
      provider = await createKieImageTask({
        prompt: prompt.trim(),
        modelKey: model,
        ratio,
        quality,
        referenceImageUrls,
      })
    } catch (primaryError) {
      if (!fallbackModel) throw primaryError
      console.warn(
        `create image task ${taskId} with ${model} failed, retrying with ${fallbackModel}:`,
        primaryError.message,
        primaryError.body || '',
      )
      provider = await createKieImageTask({
        prompt: prompt.trim(),
        modelKey: fallbackModel,
        ratio,
        quality,
        referenceImageUrls,
      })
      providerModel = fallbackModel
    }
    await setImageTaskProviderTaskId(taskId, provider.taskId, { modelKey: providerModel })
  } catch (error) {
    console.error('create image task failed:', error.message, error.body || '')
    await refundTask(
      taskId,
      userId,
      costPoints,
      `创建任务失败：${error.message}`,
    )
  }

  return getTask(taskId, userId)
}

export async function recoverProcessingImageTasks() {
  const rows = await findRefreshableImageTasks()
  await Promise.all(rows.map((row) => refreshTask(row.id)))
  return rows.length
}

async function refreshTask(id) {
  const task = await findImageTaskStatus(id)
  if (
    !task ||
    !task.provider_task_id ||
    !['pending', 'processing'].includes(task.status)
  )
    return

  try {
    const record = await getKieTask(task.provider_task_id)
    const mapped = mapKieState(record.data?.state)
    if (mapped === 'completed') {
      const providerUrls = extractResultUrls(record)
      const localUrls = await persistGeneratedImages({ taskId: id, urls: providerUrls })
      await setImageTaskCompleted(id, localUrls, { providerUrls })
    } else if (mapped === 'failed') {
      await refundTask(id, null, null, record.data?.failMsg || '创建任务失败')
    } else {
      await setImageTaskProcessing(id)
    }
  } catch (error) {
    await setImageTaskError(id, `同步任务结果失败：${error.message}`)
  }
}

async function refundTask(id, userIdArg, costPointsArg, message) {
  const connection = await getPool().getConnection()
  try {
    await connection.beginTransaction()
    const task = await lockImageTaskForRefund(connection, id)
    if (!task) {
      await connection.rollback()
      return
    }

    const userId = userIdArg || task.user_id
    const costPoints = costPointsArg || task.cost_points
    await setImageTaskFailed(connection, id, message)

    if (!task.refunded) {
      await refundCredits(connection, {
        userId,
        taskId: id,
        amount: costPoints,
        memo: 'image generation refund',
      })
      await markImageTaskRefunded(connection, id)
    }

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function deleteTask(id, userId) {
  const result = await deleteImageTask(id, userId)
  if (result.ok) {
    await removeStoredGeneratedImages({ taskId: id }).catch((error) => {
      console.warn(`delete local image result files for task ${id} failed:`, error.message)
    })
  }
  return result
}

export async function toggleFavorite(id, userId) {
  await toggleImageTaskFavorite(id, userId)
  return getTask(id, userId)
}

function normalizeInspirationId(value) {
  const id = String(value || '').trim()
  if (!id || id.length > 180) {
    throw createHttpError('inspiration id is required', 400)
  }
  return id
}

export async function listInspirationFavorites(userId) {
  const favorites = await listInspirationFavoriteEntries(userId)
  return {
    ids: favorites.map((favorite) => favorite.id),
    favorites,
  }
}

export async function toggleInspirationFavorite(id, userId) {
  const inspirationId = normalizeInspirationId(id)
  const existing = await findInspirationFavorite(userId, inspirationId)
  if (existing) {
    await removeInspirationFavorite(userId, inspirationId)
    return { id: inspirationId, favorite: false }
  }

  await addInspirationFavorite(userId, inspirationId)
  return { id: inspirationId, favorite: true }
}
