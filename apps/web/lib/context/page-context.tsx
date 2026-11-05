"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"
import { usePathname } from "next/navigation"

export interface PageContextData {
  pathname: string
  module: string
  pageTitle: string
  activeTab?: string
  activeModal?: string | null // e.g. "create_note", "edit_note", "delete_transaction", etc.
  activeItem?: Record<string, any> | null // content of open note, transaction, item, etc.
  visibleSummary?: string // brief synthesized summary of visible page state
}

interface PageContextType {
  context: PageContextData
  setPageContext: (patch: Partial<PageContextData>) => void
  setActiveTab: (tab: string) => void
  setActiveModal: (modal: string | null, item?: Record<string, any> | null) => void
  setActiveItem: (item: Record<string, any> | null) => void
  getSnapshot: () => PageContextData
}

const PageContext = createContext<PageContextType | null>(null)

function getModuleFromPath(pathname: string): { module: string; pageTitle: string } {
  if (pathname === "/dashboard") return { module: "dashboard", pageTitle: "Dashboard Overview" }
  if (pathname.startsWith("/dashboard/finance")) return { module: "finance", pageTitle: "Finance & Treasury" }
  if (pathname.startsWith("/dashboard/notes")) return { module: "notes", pageTitle: "Notes & Workspace" }
  if (pathname.startsWith("/dashboard/fitness")) return { module: "fitness", pageTitle: "Fitness & Training" }
  if (pathname.startsWith("/dashboard/food")) return { module: "food", pageTitle: "Food & Nutrition" }
  if (pathname.startsWith("/dashboard/fashion")) return { module: "fashion", pageTitle: "Fashion & Wardrobe" }
  if (pathname.startsWith("/dashboard/skincare")) return { module: "skincare", pageTitle: "Skincare & Self-Care" }
  if (pathname.startsWith("/dashboard/time")) return { module: "time", pageTitle: "Time Tracking" }
  if (pathname.startsWith("/dashboard/saved")) return { module: "saved", pageTitle: "Saved Items" }
  if (pathname.startsWith("/dashboard/settings")) return { module: "settings", pageTitle: "Terminal Settings" }
  if (pathname.startsWith("/dashboard/profile")) return { module: "profile", pageTitle: "User Profile" }
  if (pathname.startsWith("/dashboard/chat")) return { module: "chat", pageTitle: "AI Assistant" }
  return { module: "workspace", pageTitle: "Aura360 Workspace" }
}

export function PageContextProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const { module, pageTitle } = useMemo(() => getModuleFromPath(pathname || ""), [pathname])

  const [context, setContext] = useState<PageContextData>({
    pathname: pathname || "/dashboard",
    module,
    pageTitle,
    activeTab: undefined,
    activeModal: null,
    activeItem: null,
    visibleSummary: undefined,
  })

  // 1. Pathname sync
  useEffect(() => {
    const { module: nextModule, pageTitle: nextTitle } = getModuleFromPath(pathname || "")
    const tabParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null

    setContext((prev) => ({
      ...prev,
      pathname: pathname || "/dashboard",
      module: nextModule,
      pageTitle: nextTitle,
      activeTab: tabParam || prev.activeTab,
      activeModal: null,
      activeItem: null,
    }))
  }, [pathname])

  // 2. Automated DOM Inspector
  // Continuously observes active tabs, open dialogs (Create/Edit/Delete modals), and visible headings
  useEffect(() => {
    if (typeof window === "undefined") return

    const inspectDOM = () => {
      let detectedTab: string | undefined = undefined
      let detectedModal: string | null = null
      let detectedItemData: Record<string, any> | null = null

      // Detect active Tab in Radix / Headless / standard Tabs
      const activeTabEl = document.querySelector(
        '[role="tab"][data-state="active"], [role="tab"][aria-selected="true"], button[data-state="active"]'
      )
      if (activeTabEl) {
        const text = activeTabEl.textContent?.trim().toLowerCase()
        if (text && text.length < 30) {
          detectedTab = text
        }
      }

      // Detect open Dialog / Modal (Create, Edit, Delete)
      const openDialog = document.querySelector('[role="dialog"][data-state="open"], [role="dialog"]')
      if (openDialog) {
        const dialogTitleEl = openDialog.querySelector("h2, h3, [data-slot='dialog-title'], [class*='title']")
        const dialogTitle = dialogTitleEl?.textContent?.trim() || ""

        if (dialogTitle) {
          detectedModal = dialogTitle
        }

        // Try extracting form inputs / field values inside the open dialog
        const inputs = openDialog.querySelectorAll("input, textarea, select")
        if (inputs.length > 0) {
          const formValues: Record<string, string> = {}
          inputs.forEach((input: any) => {
            const name = input.name || input.id || input.placeholder || "field"
            if (input.value && input.type !== "hidden" && input.type !== "password") {
              formValues[name] = String(input.value).slice(0, 150)
            }
          })
          if (Object.keys(formValues).length > 0) {
            detectedItemData = formValues
          }
        }
      }

      // Check if user is viewing or editing a specific note, transaction, or card
      const activeCard = document.querySelector('[data-active-item="true"]')
      if (activeCard) {
        const cardTitle = activeCard.querySelector("h3, h4, [class*='title']")?.textContent?.trim()
        const cardSnippet = activeCard.querySelector("p, [class*='content']")?.textContent?.trim()
        if (cardTitle || cardSnippet) {
          detectedItemData = {
            title: cardTitle,
            content: cardSnippet?.slice(0, 200),
          }
        }
      }

      setContext((prev) => {
        const tabChanged = detectedTab && detectedTab !== prev.activeTab
        const modalChanged = detectedModal !== prev.activeModal
        const itemChanged = detectedItemData && JSON.stringify(detectedItemData) !== JSON.stringify(prev.activeItem)

        if (tabChanged || modalChanged || itemChanged) {
          return {
            ...prev,
            activeTab: detectedTab || prev.activeTab,
            activeModal: detectedModal ?? prev.activeModal,
            activeItem: detectedItemData ?? prev.activeItem,
          }
        }
        return prev
      })
    }

    // Inspect initially and on DOM mutations
    inspectDOM()
    const observer = new MutationObserver(() => {
      inspectDOM()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "aria-selected", "class"],
    })

    return () => observer.disconnect()
  }, [pathname])

  const setPageContext = useCallback((patch: Partial<PageContextData>) => {
    setContext((prev) => ({ ...prev, ...patch }))
  }, [])

  const setActiveTab = useCallback((tab: string) => {
    setContext((prev) => ({ ...prev, activeTab: tab }))
  }, [])

  const setActiveModal = useCallback((modal: string | null, item?: Record<string, any> | null) => {
    setContext((prev) => ({ ...prev, activeModal: modal, activeItem: item || prev.activeItem }))
  }, [])

  const setActiveItem = useCallback((item: Record<string, any> | null) => {
    setContext((prev) => ({ ...prev, activeItem: item }))
  }, [])

  const getSnapshot = useCallback(() => context, [context])

  return (
    <PageContext.Provider
      value={{
        context,
        setPageContext,
        setActiveTab,
        setActiveModal,
        setActiveItem,
        getSnapshot,
      }}
    >
      {children}
    </PageContext.Provider>
  )
}

export function usePageContext(): PageContextType {
  const ctx = useContext(PageContext)
  if (!ctx) {
    const defaultData: PageContextData = {
      pathname: typeof window !== "undefined" ? window.location.pathname : "/dashboard",
      module: "workspace",
      pageTitle: "Aura360",
      activeTab: undefined,
      activeModal: null,
      activeItem: null,
      visibleSummary: undefined,
    }
    return {
      context: defaultData,
      setPageContext: () => {},
      setActiveTab: () => {},
      setActiveModal: () => {},
      setActiveItem: () => {},
      getSnapshot: () => defaultData,
    }
  }
  return ctx
}
