"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Bell, Check, RefreshCw, Loader2, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react"
import { notificationApi } from "@/lib/api-client"
import { Notification } from "@/lib/types"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { toast } from "react-hot-toast"
import { fcmService } from "@/lib/firebase"
import type { MessagePayload } from "firebase/messaging"

interface FCMNotification {
  id: string
  title: string
  content: string
  created_at: string
  is_read: boolean
  is_fcm: true
  payload?: MessagePayload
}

type CombinedNotification = Notification | FCMNotification

export default function NotificationsPage() {
  const [notifications, setNotifications]         = useState<Notification[]>([])
  const [fcmNotifications, setFcmNotifications]   = useState<FCMNotification[]>([])
  const [isLoading, setIsLoading]                 = useState(true)
  const [isRefreshing, setIsRefreshing]           = useState(false)
  const [page, setPage]                           = useState(1)
  const [hasNext, setHasNext]                     = useState(false)
  const [hasPrevious, setHasPrevious]             = useState(false)

  const fetchNotifications = async (pageNum = 1) => {
    try {
      setIsRefreshing(pageNum === 1)
      setIsLoading(pageNum === 1)
      const response = await notificationApi.getAll(pageNum)
      setNotifications(response.results)
      setHasNext(!!response.next)
      setHasPrevious(!!response.previous)
      setPage(pageNum)
    } catch { toast.error("Échec du chargement") }
    finally { setIsLoading(false); setIsRefreshing(false) }
  }

  useEffect(() => { fetchNotifications() }, [])

  useEffect(() => {
    const handleFocus = () => fetchNotifications(page)
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [page])

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = localStorage.getItem("fcm_notifications")
    if (stored) {
      try { setFcmNotifications(JSON.parse(stored)) } catch {}
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const handleFCMMessage = (payload: MessagePayload) => {
      const fcmNotification: FCMNotification = {
        id: `fcm-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        title: payload.notification?.title || "Nouvelle notification",
        content: payload.notification?.body || payload.data?.body || "",
        created_at: new Date().toISOString(),
        is_read: false,
        is_fcm: true,
        payload,
      }
      setFcmNotifications(prev => {
        const updated = [fcmNotification, ...prev]
        localStorage.setItem("fcm_notifications", JSON.stringify(updated))
        return updated
      })
    }
    fcmService.setupForegroundListener(handleFCMMessage)
    if ("serviceWorker" in navigator) {
      const messageHandler = (event: MessageEvent) => {
        if (event.data?.firebaseMessaging) handleFCMMessage(event.data.firebaseMessaging)
      }
      navigator.serviceWorker.addEventListener("message", messageHandler)
      return () => navigator.serviceWorker.removeEventListener("message", messageHandler)
    }
  }, [])

  const markAsRead = async (notificationId: number | string) => {
    if (typeof notificationId === "string" && notificationId.startsWith("fcm-")) {
      setFcmNotifications(prev => {
        const updated = prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        localStorage.setItem("fcm_notifications", JSON.stringify(updated))
        return updated
      })
      return
    }
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n))
  }

  const formatDate = (dateString: string) => {
    try { return format(parseISO(dateString), "dd MMM yyyy, HH:mm", { locale: fr }) }
    catch { return dateString }
  }

  const allNotifications: CombinedNotification[] = [...fcmNotifications, ...notifications]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const unreadCount = allNotifications.filter(n => !n.is_read).length

  return (
    <div className="space-y-5 pb-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Notifications</h1>
          <p className="text-xs text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} non lue(s)` : "Tout est à jour"}
          </p>
        </div>
        <button
          onClick={() => fetchNotifications()}
          disabled={isRefreshing}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-14">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : allNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 px-4 text-center rounded-2xl border border-border/60 bg-card">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Bell className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-foreground">Aucune notification</p>
          <p className="text-xs text-muted-foreground mt-1">Vos notifications apparaîtront ici.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          {allNotifications.map((notification, index) => {
            const isFCM = "is_fcm" in notification && notification.is_fcm
            return (
              <div
                key={notification.id}
                className={`px-4 py-4 transition-colors ${
                  index !== allNotifications.length - 1 ? "border-b border-border/40" : ""
                } ${!notification.is_read ? "bg-primary/[0.03]" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 text-white ${
                    isFCM
                      ? "bg-violet-500"
                      : "bg-blue-500"
                  }`}>
                    {isFCM ? <MessageSquare className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-foreground leading-snug flex-1 truncate">{notification.title}</h3>
                      {!notification.is_read && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                      {isFCM && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 rounded-md bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] font-medium">Push</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-2">{notification.content}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground/60">{formatDate(notification.created_at)}</span>
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          Marquer lu
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {(hasNext || hasPrevious) && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/20">
              <p className="text-xs text-muted-foreground">Page {page}</p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => fetchNotifications(page - 1)}
                  disabled={!hasPrevious || isLoading}
                  className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors bg-card"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => fetchNotifications(page + 1)}
                  disabled={!hasNext || isLoading}
                  className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors bg-card"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
