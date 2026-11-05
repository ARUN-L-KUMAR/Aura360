"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Crown, 
  UserCheck, 
  Eye, 
  Trash2, 
  Loader2, 
  Mail,
  AlertCircle
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Member {
  id: string
  workspaceId: string
  userId: string
  role: "owner" | "admin" | "member" | "viewer"
  invitedAt: string
  joinedAt: string | null
  userName: string | null
  userEmail: string
  userImage: string | null
}

export function WorkspaceTeamSettings() {
  const { data: session } = useSession()
  const [members, setMembers] = useState<Member[]>([])
  const [workspaceOwnerId, setWorkspaceOwnerId] = useState<string>("")
  const [currentUserRole, setCurrentUserRole] = useState<string>("member")
  const [canManage, setCanManage] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member")
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const fetchMembers = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/workspaces/members")
      if (!res.ok) {
        throw new Error("Failed to load workspace members")
      }
      const data = await res.json()
      setMembers(data.members || [])
      setWorkspaceOwnerId(data.workspaceOwnerId || "")
      setCurrentUserRole(data.currentUserRole || "member")
      setCanManage(data.canManage || false)
    } catch (err: any) {
      setError(err?.message || "Error loading members")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [session?.user?.workspaceId])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteLoading(true)
    setInviteError(null)
    setInviteSuccess(null)

    try {
      const res = await fetch("/api/workspaces/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to invite member")
      }

      setInviteSuccess(data.message || "Member invited successfully!")
      setInviteEmail("")
      fetchMembers()
      setTimeout(() => {
        setIsInviteOpen(false)
        setInviteSuccess(null)
      }, 1500)
    } catch (err: any) {
      setInviteError(err?.message || "Failed to invite member")
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: "admin" | "member" | "viewer") => {
    try {
      setActionLoadingId(memberId)
      const res = await fetch("/api/workspaces/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role: newRole }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update role")
      }

      fetchMembers()
    } catch (err: any) {
      alert(err?.message || "Failed to update role")
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName || "this member"} from the workspace?`)) {
      return
    }

    try {
      setActionLoadingId(memberId)
      const res = await fetch(`/api/workspaces/members?memberId=${memberId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to remove member")
      }

      fetchMembers()
    } catch (err: any) {
      alert(err?.message || "Failed to remove member")
    } finally {
      setActionLoadingId(null)
    }
  }

  const renderRoleBadge = (role: string, isOwner: boolean) => {
    if (isOwner || role === "owner") {
      return (
        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 font-bold text-[10px] uppercase">
          <Crown className="w-3 h-3" />
          Owner
        </Badge>
      )
    }
    if (role === "admin") {
      return (
        <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 gap-1 font-bold text-[10px] uppercase">
          <ShieldCheck className="w-3 h-3" />
          Admin
        </Badge>
      )
    }
    if (role === "viewer") {
      return (
        <Badge variant="outline" className="text-purple-600 dark:text-purple-400 border-purple-500/30 gap-1 font-bold text-[10px] uppercase">
          <Eye className="w-3 h-3" />
          Viewer
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="gap-1 font-bold text-[10px] uppercase">
        <UserCheck className="w-3 h-3" />
        Member
      </Badge>
    )
  }

  return (
    <Card id="workspace-team" className="backdrop-blur-sm bg-card/50 border-border shadow-sm transition-all hover:border-primary/30">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-6">
        <div className="space-y-1">
          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-500" />
            Workspace & Team Access
          </CardTitle>
          <CardDescription className="text-xs font-semibold">
            Manage multi-tenant workspace members and collaborator roles
          </CardDescription>
        </div>

        {canManage && (
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-2 font-bold text-xs uppercase tracking-wider">
                <UserPlus className="w-3.5 h-3.5" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleInvite}>
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold">Invite to Workspace</DialogTitle>
                  <DialogDescription className="text-xs">
                    Collaborate across finances, fashion, and lifestyle tracking.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      User Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="collaborator@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="pl-9 h-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="invite-role" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Access Role
                    </Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(val: "admin" | "member" | "viewer") => setInviteRole(val)}
                    >
                      <SelectTrigger id="invite-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex flex-col text-left">
                            <span className="font-bold text-xs">Admin</span>
                            <span className="text-[10px] text-muted-foreground">Full access to manage workspace and members</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="member">
                          <div className="flex flex-col text-left">
                            <span className="font-bold text-xs">Member</span>
                            <span className="text-[10px] text-muted-foreground">Can view and add entries to the workspace</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="viewer">
                          <div className="flex flex-col text-left">
                            <span className="font-bold text-xs">Viewer</span>
                            <span className="text-[10px] text-muted-foreground">Read-only access to records and insights</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {inviteError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{inviteError}</span>
                    </div>
                  )}

                  {inviteSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-lg flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{inviteSuccess}</span>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsInviteOpen(false)}
                    disabled={inviteLoading}
                    className="h-9"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={inviteLoading} className="h-9 font-bold text-xs uppercase tracking-wider">
                    {inviteLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Inviting...
                      </div>
                    ) : (
                      "Add Member"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-xs font-medium">
            No team members added to this workspace yet.
          </div>
        ) : (
          <div className="divide-y divide-border/60 rounded-xl border border-border overflow-hidden bg-secondary/10">
            {members.map((member) => {
              const isOwner = member.userId === workspaceOwnerId
              const isSelf = member.userId === session?.user?.id
              const isActionLoading = actionLoadingId === member.id

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3.5 hover:bg-secondary/30 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="w-9 h-9 border border-border">
                      <AvatarImage src={member.userImage || undefined} />
                      <AvatarFallback className="text-xs font-bold uppercase bg-primary/10 text-primary">
                        {(member.userName || member.userEmail).slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold truncate">
                          {member.userName || member.userEmail.split("@")[0]}
                        </p>
                        {isSelf && (
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            (You)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{member.userEmail}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {canManage && !isOwner && !isSelf ? (
                      <Select
                        value={member.role}
                        onValueChange={(val: "admin" | "member" | "viewer") =>
                          handleRoleChange(member.id, val)
                        }
                        disabled={isActionLoading}
                      >
                        <SelectTrigger className="h-7 w-24 text-[11px] font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      renderRoleBadge(member.role, isOwner)
                    )}

                    {canManage && !isOwner && !isSelf && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() =>
                          handleRemoveMember(member.id, member.userName || member.userEmail)
                        }
                        disabled={isActionLoading}
                        title="Remove member"
                      >
                        {isActionLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
