import { Layout } from "@arco-design/web-react";

const { Header, Sider, Content } = Layout;

export function AppShell({
  activeNav,
  children,
  className = "",
  header,
  isGuest = false,
  guestAuthActions = null,
  sidebar,
}) {
  const shellClassName = [
    "app-shell",
    "feature-page-shell",
    isGuest ? "is-guest" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Layout className={shellClassName} data-active-nav={activeNav}>
      <Sider
        className="app-shell__sider feature-sidebar"
        width="var(--app-sidebar-width)"
        breakpoint="lg"
        collapsible
        trigger={null}
      >
        {sidebar}
      </Sider>
      {guestAuthActions}
      <Layout className="app-shell__body">
        <Header className="app-shell__header">{header}</Header>
        <Content className="app-shell__content feature-main">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
