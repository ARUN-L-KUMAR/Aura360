"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { 
  Building2, 
  Check, 
  ChevronsUpDown, 
  Plus, 
  Users, 
  ShieldCheck, 
  Eye, 
  UserCheck, 
  Crown 
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Workspace {
  id: string
  name: string
  slug: string
  ownerId: string
  settings?: {
    currency?: string
    timezone?: string
  }
}

interface Membership {
  workspace: Workspace
  role: "owner" | "admin" | "member" | "viewer"
}

export function WorkspaceSwitcher() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [ownedWorkspaces, setOwnedWorkspaces] = useState<Workspace[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])

  const currentWorkspaceId = session?.user?.workspaceId

  const fetchWorkspaces = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/workspaces")
      if (res.ok) {
        const data = await res.json()
        setOwnedWorkspaces(data.owned || [])
        setMemberships(data.memberships || [])
      }
    } catch (err) {
      console.error("[WorkspaceSwitcher] Failed to fetch workspaces", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user) {
      fetchWorkspaces()
    }
  }, [session?.user?.id])

  const currentWorkspace =
    ownedWorkspaces.find((w) => w.id === currentWorkspaceId) ||
    memberships.find((m) => m.workspace.id === currentWorkspaceId)?.workspace

  const handleSwitch = async (workspaceId: string) => {
    if (workspaceId === currentWorkspaceId || switching) return

    try {
      setSwitching(true)
      const res = await fetch("/api/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      })

      if (res.ok) {
        await update({ workspaceId })
        router.refresh()
        window.location.reload()
      }
    } catch (err) {
      console.error("[WorkspaceSwitcher] Failed to switch workspace", err)
    } finally {
      setSwitching(false)
    }
  }

  const renderRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="w-3 h-3 text-amber-500 shrink-0" />
      case "admin":
        return <ShieldCheck className="w-3 h-3 text-blue-500 shrink-0" />
      case "member":
        return <UserCheck className="w-3 h-3 text-emerald-500 shrink-0" />
      case "viewer":
        return <Eye className="w-3 h-3 text-purple-500 shrink-0" />
      default:
        return null
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 bg-secondary/50 hover:bg-secondary border-border/50 text-xs font-semibold px-2.5 max-w-[200px]"
          disabled={switching}
        >
          <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="truncate">
            {switching ? "Switching..." : currentWorkspace?.name || "Select Workspace"}
          </span>
          <ChevronsUpDown className="w-3 h-3 text-muted-foreground/60 shrink-0 ml-auto" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 p-1.5 shadow-xl">
        <DropdownMenuLabel className="text-[10px] uppercase font-black tracking-widest text-muted-foreground px-2 py-1">
          Your Workspaces
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          {ownedWorkspaces.map((ws) => {
            const isSelected = ws.id === currentWorkspaceId
            return (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => handleSwitch(ws.id)}
                className="flex items-center justify-between text-xs font-medium py-1.5 px-2 cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="truncate">{ws.name}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>

        {memberships.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase font-black tracking-widest text-muted-foreground px-2 py-1">
              Shared With You
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {memberships.map(({ workspace: ws, role }) => {
                const isSelected = ws.id === currentWorkspaceId
                return (
                  <DropdownMenuItem
                    key={ws.id}
                    onClick={() => handleSwitch(ws.id)}
                    className="flex items-center justify-between text-xs font-medium py-1.5 px-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {renderRoleIcon(role)}
                      <span className="truncate">{ws.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase">
                        {role}
                      </Badge>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </div>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuGroup>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/dashboard/settings#workspace-team")}
          className="text-xs font-medium py-1.5 px-2 cursor-pointer gap-2"
        >
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Team & Workspace Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push("/onboarding/workspace")}
          className="text-xs font-medium py-1.5 px-2 cursor-pointer gap-2 text-primary"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create New Workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

