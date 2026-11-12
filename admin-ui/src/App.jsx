import React, { useEffect, useState } from "react";
import { AppShell } from "@astryxdesign/core/AppShell";
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { Badge } from "@astryxdesign/core/Badge";
import { LayoutDashboard, FileText, MessageSquare, BarChart3, SearchCheck, Files, History, LogOut, ExternalLink, Rocket } from "lucide-react";
import { api, setUnauthorizedHandler } from "./api.js";
import { Loading } from "./ui.jsx";
import { Login } from "./pages/Login.jsx";
import { Overview } from "./pages/Overview.jsx";
import { Articles } from "./pages/Articles.jsx";
import { ArticleEditor } from "./pages/ArticleEditor.jsx";
import { Comments } from "./pages/Comments.jsx";
import { Analytics } from "./pages/Analytics.jsx";
import { Seo } from "./pages/Seo.jsx";
import { Pages } from "./pages/Pages.jsx";
import { Publishing } from "./pages/Publishing.jsx";
import { Activity } from "./pages/Activity.jsx";

const readRoute = () => (window.location.hash.replace(/^#/, "") || "/").split("/").filter(Boolean);
export const go = (path) => { window.location.hash = path; };

function useRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const onChange = () => setRoute(readRoute());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

const NAV = [
  { path: "", label: "Áttekintés", icon: LayoutDashboard },
  { path: "cikkek", label: "Cikkek", icon: FileText },
  { path: "hozzaszolasok", label: "Hozzászólások", icon: MessageSquare },
  { path: "analitika", label: "Analitika", icon: BarChart3 },
  { path: "seo", label: "SEO, AEO, GEO", icon: SearchCheck },
  { path: "oldalak", label: "Oldalak", icon: Files },
  { path: "kozzetetel", label: "Közzététel", icon: Rocket },
  { path: "naplo", label: "Napló és biztonság", icon: History },
];

export function App() {
  const route = useRoute();
  const [session, setSession] = useState({ state: "checking" });
  const [pending, setPending] = useState(0);

  useEffect(() => {
    setUnauthorizedHandler(() => setSession({ state: "out" }));
    api("/me").then((me) => setSession({ state: "in", me }), (error) => setSession({ state: "out", disabled: error.data?.error === "disabled" }));
  }, []);
  useEffect(() => {
    if (session.state !== "in") return;
    api("/comments?status=pending").then((data) => setPending(data.counts.pending), () => {});
  }, [session.state, route.join("/")]);

  if (session.state === "checking") return <div className="center-screen"><Loading /></div>;
  if (session.state !== "in" || route[0] === "belepes") {
    return <Login token={route[0] === "belepes" ? route[1] : null} disabled={session.disabled} onSignedIn={(me) => { setSession({ state: "in", me }); go("/"); }} />;
  }

  const section = route[0] || "";
  const logout = async () => {
    try { await api("/logout", { method: "POST", body: {} }); } catch { /* the session is gone either way */ }
    setSession({ state: "out" });
  };

  let page;
  if (section === "") page = <Overview />;
  else if (section === "cikkek" && route[1] === "uj") page = <ArticleEditor key="new" />;
  else if (section === "cikkek" && route[1] === "szerkesztes" && route[2]) page = <ArticleEditor key={route[2]} file={`content/${route[2]}`} />;
  else if (section === "cikkek") page = <Articles />;
  else if (section === "hozzaszolasok") page = <Comments onChange={setPending} />;
  else if (section === "analitika") page = <Analytics />;
  else if (section === "seo") page = <Seo />;
  else if (section === "oldalak") page = <Pages />;
  else if (section === "kozzetetel") page = <Publishing />;
  else if (section === "naplo") page = <Activity onSignedOut={() => setSession({ state: "out" })} />;
  else page = <Overview />;

  return (
    <AppShell
      contentPadding={0}
      sideNav={
        <SideNav
          collapsible
          header={<SideNavHeading heading="barnanorbert.com" subheading="Admin" headingHref="#/" />}
          footer={
            <SideNavSection title="Fiók" isHeaderHidden>
              <SideNavItem label="Élő oldal megnyitása" icon={ExternalLink} href="/" target="_blank" rel="noopener" />
              <SideNavItem label="Kilépés" icon={LogOut} onClick={logout} />
            </SideNavSection>
          }>
          <SideNavSection title="Menü" isHeaderHidden>
            {NAV.map((item) => (
              <SideNavItem
                key={item.path}
                label={item.label}
                icon={item.icon}
                href={`#/${item.path}`}
                isSelected={section === item.path}
                endContent={item.path === "hozzaszolasok" && pending > 0 ? <Badge variant="warning" label={String(pending)} /> : undefined}
              />
            ))}
          </SideNavSection>
        </SideNav>
      }>
      <main className="page">{page}</main>
    </AppShell>
  );
}
