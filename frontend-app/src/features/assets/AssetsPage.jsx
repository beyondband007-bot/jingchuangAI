import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./assetsStyles.css";
import { authApi } from "../../api/authApi";
import { paymentApi } from "../../api/paymentApi";
import { invitationApi } from "../../api/invitationApi";
import { imageApi } from "../../api/imageApi";
import { videoApi } from "../../api/videoApi";
import { digitalHumanApi } from "../../api/digitalHumanApi";
import { imageDigitalHumanApi } from "../../api/imageDigitalHumanApi";
import { emitCreditsUpdated } from "../../api/creditsEvents";
import { refreshCachedCredits } from "../../api/creditsCache";
import { loadTencentCaptchaScript } from "../auth/tencentCaptcha";
import { articleApi } from "../article/articleApi";
import { useDeleteConfirmation } from "../../components/DeleteConfirmDialog";
import { useToast } from "../../components/ToastProvider";
import { getFileSizeLimitError, UPLOAD_SIZE_LIMITS } from "../../utils/uploadLimits";
import { FaceminiInspirationModal } from "../image/FaceminiInspirationModal";
import { VideoInspirationModal } from "../video/VideoCards";
import {
  assetGalleryTabStorageKey,
  assetsViewModeStorageKey,
} from "./assetStorage";
import {
  assetTimeFilterOptions,
  canFavoriteAsset,
  getAssetTimeRange,
  isArticleImageTask,
  isBuiltInAvatarUrl,
  isDigitalHumanAssetType,
  isTimestampInRange,
  mapArticleAssets,
  mapAssetTasks,
  matchesAssetGalleryTab,
  transactionsPageSize,
} from "./assetMappers";
import { BillingCenterView } from "./BillingCenterView";
import { ProfileCenterView } from "./ProfileCenterView";
import {
  AccountSettingsContent,
  getAccountSettingsTitle,
} from "./AccountSettingsContent";
import {
  AssetGalleryView,
  AssetTimeFilterControl,
  FavoriteAssetsView,
} from "./AssetGalleryViews";
import {
  finalPaymentStatuses,
  getPaymentExpiresAt,
  paymentCodeTtlSeconds,
  paymentResultInfo,
  paymentResultTtlSeconds,
  rechargePresets,
} from "./paymentUtils";
import {
  buildClientInviteLink,
  inviteRewardPoints,
} from "../invite/inviteUtils";
import {
  favoriteModuleTabs,
  favoriteTabToAssetType,
  inspirationFavoritesChangedEvent,
  isInspirationFavorite,
  loadInspirationFavorites,
  toggleInspirationFavoriteId,
  writePendingGenerationSeed,
} from "../generation/generationState";
import { mapInspirationFavoriteCards } from "./inspirationFavoriteMappers";

const defaultUserAvatarSrc = "/assets/avatars/1.jpg";
export function AssetsPage({
  authUser,
  onOpenAuth,
  onOpenFeature,
  onOpenInvite,
  pageMode = null,
}) {
  const { showToast } = useToast();
  const isGuest = !authUser || Boolean(authUser.isGuest);
  const [credits, setCredits] = useState(null);
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [userAssets, setUserAssets] = useState([]);
  const [inspirationFavorites, setInspirationFavorites] = useState([]);
  const [activeAssetTab, setActiveAssetTab] = useState(() => {
    try {
      return window.sessionStorage.getItem(assetGalleryTabStorageKey) || "全部";
    } catch {
      return "全部";
    }
  });
  const [viewMode, setViewMode] = useState(() => {
    try {
      const stored = window.sessionStorage.getItem(assetsViewModeStorageKey);
      if (
        stored === "profile" ||
        stored === "favorites" ||
        stored === "gallery"
      ) {
        return stored;
      }
      return "gallery";
    } catch {
      return "gallery";
    }
  });
  const [inviteProfile, setInviteProfile] = useState(null);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [monthlyConsumedCredits, setMonthlyConsumedCredits] = useState(0);
  const [favoriteTab, setFavoriteTab] = useState("图片灵感");
  const [amount, setAmount] = useState(1);
  const [activePreset, setActivePreset] = useState(1);
  const [paymentProvider, setPaymentProvider] = useState("alipay");
  const [activeTab, setActiveTab] = useState("recharge");
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionFilter, setTransactionFilter] = useState("all");
  const [assetTimePreset, setAssetTimePreset] = useState("all");
  const [assetStartDate, setAssetStartDate] = useState("");
  const [assetEndDate, setAssetEndDate] = useState("");
  const [transactionMeta, setTransactionMeta] = useState({
    page: 1,
    pageSize: transactionsPageSize,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [paymentDialog, setPaymentDialog] = useState(null);
  const [paymentCountdown, setPaymentCountdown] = useState(
    paymentCodeTtlSeconds,
  );
  const [paymentResultDialog, setPaymentResultDialog] = useState(null);
  const [paymentResultCountdown, setPaymentResultCountdown] = useState(
    paymentResultTtlSeconds,
  );
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [accountSettingsPanel, setAccountSettingsPanel] = useState("list");
  const [accountSettingsTab, setAccountSettingsTab] = useState("built-in");
  const [accountSettingsError, setAccountSettingsError] = useState("");
  const [accountSettingsSuccess, setAccountSettingsSuccess] = useState("");
  const [accountSettingsSubmitting, setAccountSettingsSubmitting] =
    useState(false);
  const [accountSmsSending, setAccountSmsSending] = useState("");
  const [accountSmsCooldowns, setAccountSmsCooldowns] = useState({});
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState("");
  const [avatarUploadSrc, setAvatarUploadSrc] = useState("");
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarOffset, setAvatarOffset] = useState({ x: 0, y: 0 });
  const [avatarDragState, setAvatarDragState] = useState(null);
  const avatarImageRef = useRef(null);
  const accountSettingsCloseTimerRef = useRef(null);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState({
    oldPhoneCode: "",
    newPhone: "",
    newPhoneCode: "",
    phoneChangeToken: "",
  });
  const [phoneChangeStep, setPhoneChangeStep] = useState("old");
  const [passwordMode, setPasswordMode] = useState("password");
  const [passwordDraft, setPasswordDraft] = useState({
    oldPassword: "",
    smsCode: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [previewAsset, setPreviewAsset] = useState(null);
  const effectiveViewMode = pageMode || viewMode;

  const points = Math.max(1, Number(amount) || 1) * 100;
  const totalCreations = userAssets.length;
  const profileDisplayName =
    authUser?.displayName || authUser?.username || "用户";
  const profileCredits = Number(
    credits?.balance ?? authUser?.credits ?? 0,
  ).toLocaleString("zh-CN");
  const profileInviteCode =
    inviteProfile?.inviteCode || authUser?.inviteCode || "";
  const profileInviteLink =
    inviteProfile?.inviteLink || buildClientInviteLink(profileInviteCode);
  const favoriteAssets = useMemo(
    () => userAssets.filter((asset) => asset.favorite && canFavoriteAsset(asset)),
    [userAssets],
  );
  const inspirationFavoriteCards = useMemo(
    () => mapInspirationFavoriteCards(inspirationFavorites),
    [inspirationFavorites],
  );
  const allFavoriteCards = useMemo(
    () =>
      [...favoriteAssets, ...inspirationFavoriteCards].sort(
        (left, right) => right.sortTime - left.sortTime,
      ),
    [favoriteAssets, inspirationFavoriteCards],
  );
  const totalFavorites = allFavoriteCards.length;
  const favoriteTabCards = useMemo(
    () =>
      allFavoriteCards.filter((asset) => {
        if (favoriteTab === "数字人形象") {
          return isDigitalHumanAssetType(asset.type);
        }
        return asset.type === favoriteTabToAssetType[favoriteTab];
      }),
    [allFavoriteCards, favoriteTab],
  );
  const recentRechargeOrders = useMemo(() => {
    const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return orders
      .filter((order) => {
        const createdAt = new Date(order.createdAt).getTime();
        return Number.isFinite(createdAt) && createdAt >= oneMonthAgo;
      })
      .slice(0, 10);
  }, [orders]);
  const transactionsTotalPages = transactionMeta.totalPages || 1;
  const assetTimeRange = useMemo(
    () => getAssetTimeRange(assetTimePreset, assetStartDate, assetEndDate),
    [assetEndDate, assetStartDate, assetTimePreset],
  );
  const visibleTransactions = transactions.filter((tx) => {
    if (assetTimePreset === "all") return true;
    return isTimestampInRange(new Date(tx.createdAt).getTime(), assetTimeRange);
  });
  const latestTransaction = visibleTransactions[0] || null;

  const refreshAssets = useCallback(async () => {
    if (isGuest) return;
    setIsLoading(true);
    setError("");
    try {
      const [
        creditsState,
        orderState,
        txState,
        monthDebitState,
        imageTasks,
        videoTasks,
        digitalHumanTasks,
        imageDigitalHumanTasks,
        articleTasks,
        inspirationFavoriteState,
      ] = await Promise.all([
        refreshCachedCredits(),
        paymentApi.listOrders(),
        paymentApi.getCreditTransactions({
          type: transactionFilter,
          page: transactionsPage,
          pageSize: transactionsPageSize,
          startDate: assetTimeRange.startDate,
          endDate: assetTimeRange.endDate,
        }),
        paymentApi
          .getCreditTransactions({
            type: "debit",
            page: 1,
            pageSize: 200,
            keyword: "",
          })
          .catch(() => ({ transactions: [] })),
        imageApi.getTasks({ filter: "all", source: "all" }).catch(() => []),
        videoApi.getTasks({ filter: "all", source: "all" }).catch(() => []),
        digitalHumanApi.getTasks().catch(() => []),
        imageDigitalHumanApi.getTasks().catch(() => []),
        articleApi.getTasks({ filter: "all" }).catch(() => []),
        loadInspirationFavorites().catch(() => []),
      ]);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthlyConsumed = (monthDebitState.transactions || [])
        .filter((tx) => new Date(tx.createdAt).getTime() >= monthStart.getTime())
        .reduce(
          (sum, tx) => sum + Math.abs(Number(tx.amount) || 0),
          0,
        );
      setMonthlyConsumedCredits(monthlyConsumed);
      setCredits(creditsState);
      emitCreditsUpdated(creditsState);
      setOrders(orderState.orders || []);
      setTransactions(txState.transactions || []);
      setTransactionMeta({
        page: txState.page || 1,
        pageSize: txState.pageSize || transactionsPageSize,
        total: txState.total || 0,
        totalPages: txState.totalPages || 1,
      });
      const regularImageTasks = imageTasks.filter(
        (task) => !isArticleImageTask(task),
      );
      setUserAssets(
        [
          ...mapAssetTasks("AI 图片", regularImageTasks),
          ...mapAssetTasks("AI 视频", videoTasks),
          ...mapAssetTasks("数字人", digitalHumanTasks),
          ...mapAssetTasks("照片数字人", imageDigitalHumanTasks),
          ...mapArticleAssets(articleTasks),
        ].sort((a, b) => b.sortTime - a.sortTime),
      );
      setInspirationFavorites(inspirationFavoriteState);
    } catch (nextError) {
      setError(nextError.message || "资产信息加载失败");
    } finally {
      setIsLoading(false);
    }
  }, [
    assetTimeRange.endDate,
    assetTimeRange.startDate,
    isGuest,
    transactionFilter,
    transactionsPage,
  ]);

  useEffect(() => {
    refreshAssets();
  }, [refreshAssets]);

  useEffect(() => {
    if (isGuest) {
      setInspirationFavorites([]);
      return undefined;
    }
    let alive = true;
    function syncInspirationFavorites(event) {
      const ids = Array.isArray(event.detail?.ids)
        ? event.detail.ids.map(String)
        : [];
      if (!alive) return;
      setInspirationFavorites((current) => {
        const knownFavorites = new Map(
          current.map((favorite) => [String(favorite.id), favorite]),
        );
        return ids.map((id) => knownFavorites.get(id) || { id, createdAt: null });
      });
    }
    window.addEventListener(
      inspirationFavoritesChangedEvent,
      syncInspirationFavorites,
    );
    return () => {
      alive = false;
      window.removeEventListener(
        inspirationFavoritesChangedEvent,
        syncInspirationFavorites,
      );
    };
  }, [authUser?.id, isGuest]);

  useEffect(() => {
    if (isGuest || effectiveViewMode !== "profile") return undefined;
    let alive = true;
    invitationApi
      .me()
      .then((profile) => {
        if (alive) setInviteProfile(profile);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [authUser?.id, effectiveViewMode, isGuest]);

  useEffect(() => {
    setTransactionsPage((page) => Math.min(page, transactionsTotalPages));
  }, [transactionsTotalPages]);

  useEffect(() => {
    setTransactionsPage(1);
  }, [assetTimeRange.endDate, assetTimeRange.startDate, transactionFilter]);

  function showPaymentResult(order, statusOverride) {
    const isExpiredClosedOrder =
      order?.status === "CLOSED" &&
      String(order?.statusMessage || "").includes("超时");
    const status =
      statusOverride ||
      (isExpiredClosedOrder ? "EXPIRED" : order?.status) ||
      "CLOSED";
    const info = paymentResultInfo(status);
    setPaymentDialog(null);
    setPaymentResultCountdown(paymentResultTtlSeconds);
    setPaymentResultDialog({
      order,
      status,
      ...info,
    });
  }

  useEffect(() => {
    if (!paymentDialog || finalPaymentStatuses.has(paymentDialog.order?.status))
      return undefined;
    let alive = true;
    const sync = async () => {
      try {
        const order = await paymentApi.syncOrder(
          paymentDialog.order.outTradeNo,
          paymentDialog.orderToken,
        );
        if (!alive) return;
        if (finalPaymentStatuses.has(order.status)) {
          await refreshAssets();
          if (alive) showPaymentResult(order);
          return;
        }
        setPaymentDialog((current) =>
          current ? { ...current, order } : current,
        );
      } catch (nextError) {
        if (alive)
          setPaymentDialog((current) =>
            current ? { ...current, error: nextError.message } : current,
          );
      }
    };
    const timer = window.setInterval(sync, 3000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [
    paymentDialog?.order?.outTradeNo,
    paymentDialog?.orderToken,
    paymentDialog?.order?.status,
    refreshAssets,
  ]);

  useEffect(() => {
    if (!paymentDialog) return undefined;
    if (finalPaymentStatuses.has(paymentDialog.order?.status)) {
      showPaymentResult(paymentDialog.order);
      return undefined;
    }
    const expiresAt =
      paymentDialog.expiresAt || getPaymentExpiresAt(paymentDialog.order);
    const tick = () => {
      const nextSeconds = Math.max(
        0,
        Math.ceil((expiresAt - Date.now()) / 1000),
      );
      setPaymentCountdown(nextSeconds);
      if (nextSeconds <= 0) {
        const expiredOrder = {
          ...paymentDialog.order,
          status: "CLOSED",
          statusMessage: "订单已超时，未完成支付",
        };
        showPaymentResult(expiredOrder, "EXPIRED");
        paymentApi
          .syncOrder(paymentDialog.order.outTradeNo, paymentDialog.orderToken)
          .then(refreshAssets)
          .catch(() => {});
      }
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [
    paymentDialog?.expiresAt,
    paymentDialog?.order?.outTradeNo,
    paymentDialog?.order?.status,
  ]);

  useEffect(() => {
    if (!paymentResultDialog) return undefined;
    setPaymentResultCountdown(paymentResultTtlSeconds);
    const openedAt = Date.now();
    const timer = window.setInterval(() => {
      const nextSeconds = Math.max(
        0,
        paymentResultTtlSeconds - Math.floor((Date.now() - openedAt) / 1000),
      );
      setPaymentResultCountdown(nextSeconds);
      if (nextSeconds <= 0) {
        window.clearInterval(timer);
        setPaymentResultDialog(null);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [paymentResultDialog?.status, paymentResultDialog?.order?.outTradeNo]);

  function selectPreset(value) {
    setActivePreset(value);
    setAmount(value);
  }

  function updateAmount(value) {
    const nextAmount = Math.max(1, Number.parseInt(value || "1", 10) || 1);
    setAmount(nextAmount);
    setActivePreset(rechargePresets.includes(nextAmount) ? nextAmount : null);
  }

  async function createOrder() {
    if (isGuest) {
      onOpenAuth("login");
      return;
    }
    setIsCreating(true);
    setError("");
    try {
      const created = await paymentApi.createOrder(
        Number(amount),
        paymentProvider,
      );
      const qrState = await paymentApi.getQrCode(
        created.order.outTradeNo,
        created.orderToken,
      );
      if (finalPaymentStatuses.has(qrState.order?.status)) {
        showPaymentResult(qrState.order);
        await refreshAssets();
        return;
      }
      setPaymentDialog({
        order: qrState.order,
        orderToken: created.orderToken,
        qrCodeDataUrl: qrState.qrCodeDataUrl,
        provider: qrState.order?.provider || paymentProvider,
        expiresAt: getPaymentExpiresAt(qrState.order),
        error: "",
      });
      await refreshAssets();
    } catch (nextError) {
      setError(nextError.message || "充值订单创建失败");
    } finally {
      setIsCreating(false);
    }
  }

  const assetGalleryTabs = ["全部", "AI 图片", "AI 视频", "数字人", "爆款图文"];
  const assetGalleryCards = useMemo(() => {
    return userAssets
      .filter((item) => matchesAssetGalleryTab(item, activeAssetTab))
      .filter((item) => {
        if (assetTimePreset === "all") return true;
        return isTimestampInRange(item.sortTime, assetTimeRange);
      })
      .filter((item) => {
        if (item.type !== "AI 图片") return true;
        if (item.isVideo) return false;
        return Boolean(item.src || item.image || item.imageUrl);
      });
  }, [activeAssetTab, assetTimePreset, assetTimeRange, userAssets]);
  const visibleFavoriteCards = favoriteTabCards.filter((item) => {
    if (assetTimePreset === "all") return true;
    return isTimestampInRange(item.sortTime, assetTimeRange);
  });

  useEffect(() => {
    if (!assetGalleryTabs.includes(activeAssetTab)) setActiveAssetTab("全部");
    try {
      const nextSubTab = window.sessionStorage.getItem(
        "facemini:assets-subtab",
      );
      const nextViewMode = window.sessionStorage.getItem(assetsViewModeStorageKey);
      if (
        nextViewMode === "profile" ||
        nextViewMode === "favorites" ||
        nextViewMode === "gallery"
      ) {
        setViewMode(nextViewMode);
      }
      if (nextSubTab === "transactions" || nextSubTab === "recharge") {
        setActiveTab(nextSubTab);
      }
      if (
        window.sessionStorage.getItem("facemini:open-transactions-modal") === "1"
      ) {
        setShowTransactionsModal(true);
        window.sessionStorage.removeItem("facemini:open-transactions-modal");
      }
      window.sessionStorage.removeItem("facemini:assets-subtab");
      window.sessionStorage.removeItem(assetsViewModeStorageKey);
    } catch {
      // Session storage can be unavailable in restricted browser contexts.
    }
    function handleAssetTabChange(event) {
      const nextTab = event.detail?.tab;
      const nextSubTab = event.detail?.subTab;
      const nextViewMode = event.detail?.viewMode;
      if (assetGalleryTabs.includes(nextTab)) setActiveAssetTab(nextTab);
      if (
        nextViewMode === "profile" ||
        nextViewMode === "favorites" ||
        nextViewMode === "gallery"
      ) {
        setViewMode(nextViewMode);
      }
      if (nextSubTab === "transactions" || nextSubTab === "recharge") {
        setActiveTab(nextSubTab);
      }
      if (event.detail?.openTransactionsModal) {
        setShowTransactionsModal(true);
      }
    }
    window.addEventListener("facemini-assets-tab-change", handleAssetTabChange);
    try {
      window.sessionStorage.removeItem(assetGalleryTabStorageKey);
    } catch {
      // Session storage can be unavailable in restricted browser contexts.
    }
    return () => {
      window.removeEventListener(
        "facemini-assets-tab-change",
        handleAssetTabChange,
      );
    };
  }, []);

  useEffect(() => {
    if (!showTransactionsModal) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") setShowTransactionsModal(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showTransactionsModal]);

  useEffect(() => {
    if (!showAccountSettings) return undefined;
    setAccountSettingsPanel("list");
    setAccountSettingsTab("built-in");
    setAccountSettingsError("");
    setAccountSettingsSuccess("");
    setAccountSettingsSubmitting(false);
    setSelectedAvatarUrl(
      isBuiltInAvatarUrl(authUser?.avatarUrl)
        ? authUser.avatarUrl
        : defaultUserAvatarSrc,
    );
    setNicknameDraft(profileDisplayName);
    setPhoneDraft({
      oldPhoneCode: "",
      newPhone: "",
      newPhoneCode: "",
      phoneChangeToken: "",
    });
    setPhoneChangeStep("old");
    setPasswordMode("password");
    setPasswordDraft({
      oldPassword: "",
      smsCode: "",
      newPassword: "",
      confirmPassword: "",
    });
    setAvatarZoom(1);
    setAvatarOffset({ x: 0, y: 0 });
  }, [authUser?.avatarUrl, profileDisplayName, showAccountSettings]);

  function closeAccountSettings() {
    if (accountSettingsCloseTimerRef.current) {
      window.clearTimeout(accountSettingsCloseTimerRef.current);
      accountSettingsCloseTimerRef.current = null;
    }
    setShowAccountSettings(false);
  }

  function closeAccountSettingsAfterSuccess() {
    if (accountSettingsCloseTimerRef.current) {
      window.clearTimeout(accountSettingsCloseTimerRef.current);
    }
    accountSettingsCloseTimerRef.current = window.setTimeout(() => {
      accountSettingsCloseTimerRef.current = null;
      closeAccountSettings();
    }, 1200);
  }

  useEffect(() => {
    if (!showAccountSettings) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") closeAccountSettings();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showAccountSettings]);

  useEffect(() => {
    if (!avatarUploadSrc) return undefined;
    return () => {
      URL.revokeObjectURL(avatarUploadSrc);
    };
  }, [avatarUploadSrc]);

  useEffect(() => {
    const hasCooldown = Object.values(accountSmsCooldowns).some(
      (value) => Number(value) > 0,
    );
    if (!hasCooldown) return undefined;
    const timer = window.setTimeout(() => {
      setAccountSmsCooldowns((current) =>
        Object.fromEntries(
          Object.entries(current).map(([key, value]) => [
            key,
            Math.max(0, Number(value) - 1),
          ]),
        ),
      );
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [accountSmsCooldowns]);

  useEffect(() => {
    return () => {
      if (accountSettingsCloseTimerRef.current) {
        window.clearTimeout(accountSettingsCloseTimerRef.current);
      }
    };
  }, []);

  function selectAssetTab(tab) {
    setActiveAssetTab(tab);
    try {
      window.sessionStorage.setItem(assetGalleryTabStorageKey, tab);
    } catch {
      // Session storage can be unavailable in restricted browser contexts.
    }
  }

  function selectTransactionFilter(nextFilter) {
    setTransactionFilter(nextFilter);
    setTransactionsPage(1);
  }

  function selectAssetTimePreset(nextPreset) {
    setAssetTimePreset(nextPreset);
    if (nextPreset !== "custom") {
      setAssetStartDate("");
      setAssetEndDate("");
    }
    setTransactionsPage(1);
  }

  function updateAssetStartDate(value) {
    setAssetTimePreset("custom");
    setAssetStartDate(value);
    setTransactionsPage(1);
  }

  function updateAssetEndDate(value) {
    setAssetTimePreset("custom");
    setAssetEndDate(value);
    setTransactionsPage(1);
  }

  async function performDeleteAsset(item) {
    if (!item) return;
    if (item.isInspiration) return;
    if (item.type === "AI 图片") await imageApi.deleteTask(item.rawId);
    if (item.type === "爆款图文") await articleApi.deleteTask(item.rawId);
    if (item.type === "AI 视频") await videoApi.deleteTask(item.rawId);
    if (item.type === "照片数字人") {
      await imageDigitalHumanApi.deleteTask(item.rawId);
    } else if (item.type === "数字人") {
      await digitalHumanApi.deleteTask(item.rawId);
    }
    setPreviewAsset((current) => (current?.id === item.id ? null : current));
    await refreshAssets();
  }

  const { requestDelete: deleteAsset, deleteConfirmDialog } =
    useDeleteConfirmation({
      onConfirm: performDeleteAsset,
      title: "删除资产？",
      message: "该作品会从我的资产中移除，删除后无法恢复。",
    });

  async function toggleAssetFavorite(item) {
    if (!item) return;
    if (!canFavoriteAsset(item)) return;
    if (item.isInspiration) {
      const favoriteKey = item.favoriteKey || item.rawId || item.id;
      const nextValue = await toggleInspirationFavoriteId(favoriteKey);
      const refreshedFavorites = await loadInspirationFavorites().catch(
        () => null,
      );
      if (refreshedFavorites) setInspirationFavorites(refreshedFavorites);
      return nextValue;
    }
    if (item.type === "AI 图片") await imageApi.toggleFavorite(item.rawId);
    if (item.type === "爆款图文") await articleApi.toggleFavorite(item.rawId);
    if (item.type === "AI 视频") await videoApi.toggleFavorite(item.rawId);
    if (item.type === "数字人" || item.type === "照片数字人" || item.type === "爆款图文") {
      setUserAssets((current) =>
        current.map((asset) =>
          asset.id === item.id
            ? { ...asset, favorite: !asset.favorite }
            : asset,
        ),
      );
      return;
    }
    await refreshAssets();
  }

  async function togglePreviewAssetFavorite(item) {
    if (!item) return Boolean(item?.favorite);
    if (!canFavoriteAsset(item)) return false;
    const nextValue = !Boolean(item.favorite);
    setPreviewAsset((current) =>
      current?.id === item.id ? { ...current, favorite: nextValue } : current,
    );
    try {
      const confirmedValue = await toggleAssetFavorite(item);
      return typeof confirmedValue === "boolean" ? confirmedValue : nextValue;
    } catch (error) {
      setPreviewAsset((current) =>
        current?.id === item.id
          ? { ...current, favorite: item.favorite }
          : current,
      );
      throw error;
    }
  }

  function remixAsset(item) {
    const target = item.launchTarget || (item.isVideo ? "video" : "image");
    writePendingGenerationSeed({
      target,
      prompt: item.prompt || item.title,
      notice: "已填入同款提示词",
    });
    setPreviewAsset(null);
    onOpenFeature?.(target);
  }

  function referenceAsset(item) {
    writePendingGenerationSeed({
      target: "image",
      referenceImage: {
        url: item.image || item.src || item.poster,
        originalName: `${item.title || "参考图"}.png`,
        size: 0,
        mimeType: "image/png",
      },
      notice: "已添加为参考图",
    });
    setPreviewAsset(null);
    onOpenFeature?.("image");
  }

  function goToFavoritesView() {
    setViewMode("favorites");
    setFavoriteTab("图片灵感");
    onOpenFeature?.("favorites");
  }

  function goToGalleryView() {
    setViewMode("gallery");
    onOpenFeature?.("assets");
  }

  function goToBillingView({ openTransactions = false } = {}) {
    try {
      if (openTransactions) {
        window.sessionStorage.setItem("facemini:open-transactions-modal", "1");
      }
    } catch {
      // Session storage can be unavailable in restricted browser contexts.
    }
    onOpenFeature?.("billing");
  }

  async function copyInviteLink() {
    if (!profileInviteLink) return;
    let copied = false;
    try {
      await navigator.clipboard.writeText(profileInviteLink);
      copied = true;
    } catch {
      copied = false;
    }
    if (copied) {
      setInviteLinkCopied(true);
      window.setTimeout(() => setInviteLinkCopied(false), 1800);
    }
  }

  function publishAuthUserUpdate(user) {
    if (!user) return;
    window.dispatchEvent(
      new CustomEvent("facemini-auth-user-updated", { detail: { user } }),
    );
  }

  function accountErrorMessage(error, fallback) {
    if (Number(error?.status) === 404) {
      return "账号设置接口未生效，请重启后端服务后重试";
    }
    return error?.message || fallback;
  }

  function showAccountToast(message, type = "error") {
    showToast(message, { type });
  }

  function openAccountSettingsPanel(panel) {
    setAccountSettingsPanel(panel);
    setAccountSettingsError("");
    setAccountSettingsSuccess("");
    if (panel === "avatar") {
      setSelectedAvatarUrl(
        isBuiltInAvatarUrl(authUser?.avatarUrl)
          ? authUser.avatarUrl
          : defaultUserAvatarSrc,
      );
      setAccountSettingsTab("built-in");
    }
    if (panel === "nickname") {
      setNicknameDraft(profileDisplayName);
    }
    if (panel === "phone") {
      setPhoneDraft({
        oldPhoneCode: "",
        newPhone: "",
        newPhoneCode: "",
        phoneChangeToken: "",
      });
      setPhoneChangeStep("old");
    }
    if (panel === "password") {
      setPasswordMode("password");
      setPasswordDraft({
        oldPassword: "",
        smsCode: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  }

  async function runAccountTencentCaptcha() {
    const captchaConfig = await authApi.captchaConfig();
    if (
      captchaConfig.provider !== "tencent" ||
      !captchaConfig.enabled ||
      !captchaConfig.appId
    ) {
      throw new Error("验证码服务未配置完整");
    }
    await loadTencentCaptchaScript();
    if (!window.TencentCaptcha) {
      throw new Error("验证码组件加载失败，请稍后重试");
    }

    return new Promise((resolve, reject) => {
      try {
        const captcha = new window.TencentCaptcha(
          String(captchaConfig.appId),
          (result) => {
            if (
              Number(result?.ret) === 0 &&
              result?.ticket &&
              result?.randstr
            ) {
              resolve({
                provider: "tencent",
                ticket: result.ticket,
                randstr: result.randstr,
              });
              return;
            }
            resolve(null);
          },
          { enableDarkMode: "force" },
        );
        captcha.show();
      } catch (captchaError) {
        reject(captchaError);
      }
    });
  }

  async function sendAccountSmsCode({ key, scene, phone }) {
    const targetPhone = String(phone || "").trim();
    setAccountSettingsError("");
    setAccountSettingsSuccess("");
    if (!targetPhone) {
      showAccountToast("请输入手机号", "error");
      return;
    }
    setAccountSmsSending(key);
    try {
      const captcha = await runAccountTencentCaptcha();
      if (!captcha) return;
      const result = await authApi.sendSmsCode({
        phone: targetPhone,
        scene,
        captcha,
      });
      setAccountSmsCooldowns((current) => ({ ...current, [key]: 60 }));
      showAccountToast(
        result.debugCode
          ? `短信验证码已发送，调试码：${result.debugCode}`
          : "短信验证码已发送",
        "success",
      );
    } catch (nextError) {
      showAccountToast(accountErrorMessage(nextError, "验证码发送失败"), "error");
    } finally {
      setAccountSmsSending("");
    }
  }

  function updateAvatarUploadSrc(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type || "")) {
      showAccountToast("请选择 JPG、PNG 或 WebP 图片", "error");
      return;
    }
    const sizeError = getFileSizeLimitError(
      file,
      UPLOAD_SIZE_LIMITS.accountAvatar,
      "头像图片",
    );
    if (sizeError) {
      showAccountToast(sizeError, "error");
      return;
    }
    setAccountSettingsError("");
    setAccountSettingsSuccess("");
    setAvatarUploadSrc((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setAvatarZoom(1);
    setAvatarOffset({ x: 0, y: 0 });
  }

  function drawCroppedAvatarBlob() {
    return new Promise((resolve, reject) => {
      const image = avatarImageRef.current;
      if (!image?.naturalWidth || !image?.naturalHeight) {
        reject(new Error("请先选择头像图片"));
        return;
      }
      const previewSize = 220;
      const canvasSize = 120;
      const minSide = Math.min(image.naturalWidth, image.naturalHeight);
      const scale = (previewSize / minSide) * avatarZoom;
      const sourceSize = previewSize / scale;
      const centerX =
        image.naturalWidth / 2 - avatarOffset.x / scale;
      const centerY =
        image.naturalHeight / 2 - avatarOffset.y / scale;
      const half = sourceSize / 2;
      const sourceX = Math.min(
        Math.max(0, centerX - half),
        image.naturalWidth - sourceSize,
      );
      const sourceY = Math.min(
        Math.max(0, centerY - half),
        image.naturalHeight - sourceSize,
      );
      const canvas = document.createElement("canvas");
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      const context = canvas.getContext("2d");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        canvasSize,
        canvasSize,
      );
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("头像压缩失败，请重试"));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        0.95,
      );
    });
  }

  async function saveBuiltInAvatar() {
    setAccountSettingsError("");
    setAccountSettingsSuccess("");
    setAccountSettingsSubmitting(true);
    try {
      const result = await authApi.selectAvatar({ avatarUrl: selectedAvatarUrl });
      publishAuthUserUpdate(result.user);
      showAccountToast("头像已更新", "success");
    } catch (nextError) {
      showAccountToast(accountErrorMessage(nextError, "头像保存失败"), "error");
    } finally {
      setAccountSettingsSubmitting(false);
    }
  }

  async function saveUploadedAvatar() {
    setAccountSettingsError("");
    setAccountSettingsSuccess("");
    setAccountSettingsSubmitting(true);
    try {
      const blob = await drawCroppedAvatarBlob();
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const sizeError = getFileSizeLimitError(
        file,
        UPLOAD_SIZE_LIMITS.accountAvatar,
        "头像图片",
      );
      if (sizeError) {
        throw new Error(sizeError);
      }
      const result = await authApi.uploadAvatar({
        file,
        owner: authUser?.id || "user",
      });
      publishAuthUserUpdate(result.user);
      setSelectedAvatarUrl(result.user?.avatarUrl || selectedAvatarUrl);
      showAccountToast("头像已更新", "success");
    } catch (nextError) {
      showAccountToast(accountErrorMessage(nextError, "头像保存失败"), "error");
    } finally {
      setAccountSettingsSubmitting(false);
    }
  }

  async function saveNickname() {
    setAccountSettingsError("");
    setAccountSettingsSuccess("");
    setAccountSettingsSubmitting(true);
    try {
      const result = await authApi.updateProfile({
        displayName: nicknameDraft,
      });
      publishAuthUserUpdate(result.user);
      showAccountToast("昵称已更新", "success");
    } catch (nextError) {
      showAccountToast(accountErrorMessage(nextError, "昵称保存失败"), "error");
    } finally {
      setAccountSettingsSubmitting(false);
    }
  }

  async function savePhone() {
    setAccountSettingsError("");
    setAccountSettingsSuccess("");
    setAccountSettingsSubmitting(true);
    try {
      const result = await authApi.changePhone(phoneDraft);
      publishAuthUserUpdate(result.user);
      setPhoneDraft({
        oldPhoneCode: "",
        newPhone: "",
        newPhoneCode: "",
        phoneChangeToken: "",
      });
      setPhoneChangeStep("old");
      showAccountToast("手机号已更新", "success");
    } catch (nextError) {
      showAccountToast(accountErrorMessage(nextError, "手机号保存失败"), "error");
    } finally {
      setAccountSettingsSubmitting(false);
    }
  }

  async function verifyOldPhone() {
    setAccountSettingsError("");
    setAccountSettingsSuccess("");
    setAccountSettingsSubmitting(true);
    try {
      const result = await authApi.verifyCurrentPhone({
        oldPhoneCode: phoneDraft.oldPhoneCode,
      });
      setPhoneDraft((current) => ({
        ...current,
        phoneChangeToken: result.phoneChangeToken || "",
      }));
      setPhoneChangeStep("new");
      showAccountToast("当前手机号验证通过", "success");
    } catch (nextError) {
      showAccountToast(accountErrorMessage(nextError, "当前手机号验证失败"), "error");
    } finally {
      setAccountSettingsSubmitting(false);
    }
  }

  async function savePassword() {
    setAccountSettingsError("");
    setAccountSettingsSuccess("");
    if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
      showAccountToast("两次输入的新密码不一致", "error");
      return;
    }
    setAccountSettingsSubmitting(true);
    try {
      await authApi.changePassword({
        mode: passwordMode,
        oldPassword: passwordDraft.oldPassword,
        code: passwordDraft.smsCode,
        newPassword: passwordDraft.newPassword,
      });
      setPasswordDraft({
        oldPassword: "",
        smsCode: "",
        newPassword: "",
        confirmPassword: "",
      });
      showAccountToast("密码已更新", "success");
      closeAccountSettingsAfterSuccess();
    } catch (nextError) {
      showAccountToast(accountErrorMessage(nextError, "密码保存失败"), "error");
    } finally {
      setAccountSettingsSubmitting(false);
    }
  }

  const assetTimeFilterControl = (
    <AssetTimeFilterControl
      options={assetTimeFilterOptions}
      activePreset={assetTimePreset}
      startDate={assetStartDate}
      endDate={assetEndDate}
      onSelectPreset={selectAssetTimePreset}
      onStartDateChange={updateAssetStartDate}
      onEndDateChange={updateAssetEndDate}
    />
  );
  const favoritePreviewModal =
    previewAsset?.isInspiration && previewAsset.isVideo ? (
      <VideoInspirationModal
        getInitialFavorite={isInspirationFavorite}
        item={previewAsset}
        onClose={() => setPreviewAsset(null)}
        onRemix={remixAsset}
        onFavorite={togglePreviewAssetFavorite}
        onReferencePoster={referenceAsset}
      />
    ) : (
      <FaceminiInspirationModal
        getInitialFavorite={isInspirationFavorite}
        item={previewAsset}
        onClose={() => setPreviewAsset(null)}
        onRemix={remixAsset}
        onReference={referenceAsset}
        onFavorite={
          canFavoriteAsset(previewAsset)
            ? togglePreviewAssetFavorite
            : undefined
        }
      />
    );

  if (effectiveViewMode === "gallery") {
    return (
      <AssetGalleryView
        tabs={assetGalleryTabs}
        activeTab={activeAssetTab}
        cards={assetGalleryCards}
        isLoading={isLoading}
        timeFilterControl={assetTimeFilterControl}
        previewModal={
          <FaceminiInspirationModal
            getInitialFavorite={isInspirationFavorite}
            item={previewAsset}
            onClose={() => setPreviewAsset(null)}
            onRemix={remixAsset}
            onReference={referenceAsset}
            onFavorite={
              canFavoriteAsset(previewAsset)
                ? togglePreviewAssetFavorite
                : undefined
            }
          />
        }
        deleteConfirmDialog={deleteConfirmDialog}
        onSelectTab={selectAssetTab}
        onSelect={setPreviewAsset}
        onDelete={deleteAsset}
        onToggleFavorite={toggleAssetFavorite}
      />
    );
  }

  if (effectiveViewMode === "profile") {
    return (
      <ProfileCenterView
        isGuest={isGuest}
        authUser={authUser}
        defaultUserAvatarSrc={defaultUserAvatarSrc}
        profileDisplayName={profileDisplayName}
        profileCredits={profileCredits}
        profileInviteCode={profileInviteCode}
        profileInviteLink={profileInviteLink}
        inviteLinkCopied={inviteLinkCopied}
        inviteRewardPoints={inviteRewardPoints}
        totalCreations={totalCreations}
        monthlyConsumedCredits={monthlyConsumedCredits}
        totalFavorites={totalFavorites}
        showAccountSettings={showAccountSettings}
        accountSettingsTitle={getAccountSettingsTitle(accountSettingsPanel)}
        accountSettingsContent={
          <AccountSettingsContent
            authUser={authUser}
            defaultUserAvatarSrc={defaultUserAvatarSrc}
            accountSettingsPanel={accountSettingsPanel}
            accountSettingsTab={accountSettingsTab}
            accountSettingsSubmitting={accountSettingsSubmitting}
            selectedAvatarUrl={selectedAvatarUrl}
            avatarUploadSrc={avatarUploadSrc}
            avatarOffset={avatarOffset}
            avatarZoom={avatarZoom}
            avatarDragState={avatarDragState}
            avatarImageRef={avatarImageRef}
            nicknameDraft={nicknameDraft}
            phoneDraft={phoneDraft}
            phoneChangeStep={phoneChangeStep}
            passwordMode={passwordMode}
            passwordDraft={passwordDraft}
            accountSmsSending={accountSmsSending}
            accountSmsCooldowns={accountSmsCooldowns}
            onAccountSettingsTabChange={setAccountSettingsTab}
            onSelectedAvatarUrlChange={setSelectedAvatarUrl}
            onAvatarUploadChange={updateAvatarUploadSrc}
            onAvatarDragStateChange={setAvatarDragState}
            onAvatarOffsetChange={setAvatarOffset}
            onAvatarZoomChange={setAvatarZoom}
            onNicknameDraftChange={setNicknameDraft}
            onPhoneDraftChange={setPhoneDraft}
            onPasswordModeChange={setPasswordMode}
            onPasswordDraftChange={setPasswordDraft}
            onOpenAccountSettingsPanel={openAccountSettingsPanel}
            onSendAccountSmsCode={sendAccountSmsCode}
            onSaveBuiltInAvatar={saveBuiltInAvatar}
            onSaveUploadedAvatar={saveUploadedAvatar}
            onSaveNickname={saveNickname}
            onSavePhone={savePhone}
            onVerifyOldPhone={verifyOldPhone}
            onSavePassword={savePassword}
          />
        }
        onOpenAuth={onOpenAuth}
        onOpenInvite={onOpenInvite}
        onCopyInviteLink={copyInviteLink}
        onGoToFavorites={goToFavoritesView}
        onGoToBilling={goToBillingView}
        onGoToGallery={goToGalleryView}
        onOpenAccountSettings={() => setShowAccountSettings(true)}
        onCloseAccountSettings={closeAccountSettings}
      />
    );
  }
  if (effectiveViewMode === "favorites") {
    return (
      <FavoriteAssetsView
        isGuest={isGuest}
        tabs={favoriteModuleTabs}
        activeTab={favoriteTab}
        cards={visibleFavoriteCards}
        timeFilterControl={assetTimeFilterControl}
        previewModal={favoritePreviewModal}
        deleteConfirmDialog={deleteConfirmDialog}
        onOpenAuth={onOpenAuth}
        onSelectTab={setFavoriteTab}
        onSelect={setPreviewAsset}
        onDelete={deleteAsset}
        onToggleFavorite={toggleAssetFavorite}
      />
    );
  }

  return (
    <BillingCenterView
      isGuest={isGuest}
      authUser={authUser}
      credits={credits}
      amount={amount}
      points={points}
      activePreset={activePreset}
      paymentProvider={paymentProvider}
      error={error}
      isCreating={isCreating}
      recentRechargeOrders={recentRechargeOrders}
      latestTransaction={latestTransaction}
      showTransactionsModal={showTransactionsModal}
      transactionsPage={transactionsPage}
      transactionsTotalPages={transactionsTotalPages}
      transactionMeta={transactionMeta}
      transactionFilter={transactionFilter}
      visibleTransactions={visibleTransactions}
      isLoading={isLoading}
      assetTimeFilterControl={assetTimeFilterControl}
      paymentDialog={paymentDialog}
      paymentCountdown={paymentCountdown}
      paymentResultDialog={paymentResultDialog}
      paymentResultCountdown={paymentResultCountdown}
      onOpenAuth={onOpenAuth}
      onSelectPreset={selectPreset}
      onUpdateAmount={updateAmount}
      onPaymentProviderChange={setPaymentProvider}
      onCreateOrder={createOrder}
      onShowTransactionsModalChange={setShowTransactionsModal}
      onTransactionFilterChange={selectTransactionFilter}
      onTransactionsPageChange={setTransactionsPage}
      onShowPaymentResult={showPaymentResult}
      onPaymentResultDialogChange={setPaymentResultDialog}
    />
  );
}
