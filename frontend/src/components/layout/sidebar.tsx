"use client";

import { useAppStore, ChatSession, ChatFolder } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { 
  MessageSquare, Settings, Plus, LayoutPanelLeft, 
  Trash2, Pin, Folder, FolderPlus, Search, 
  ChevronDown, ChevronRight, MoreVertical, X, FolderMinus, Wrench
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { toast } from "@/components/ui/toast";
import { useAuthStore } from "@/store/auth-store";

export function Sidebar() {
  const { 
    sidebarOpen, 
    toggleSidebar, 
    chats, 
    activeChatId, 
    setActiveChatId, 
    createChat, 
    deleteChat,
    pinnedChats,
    togglePinChat,
    folders,
    createFolder,
    deleteFolder,
    addChatToFolder,
    removeChatFromFolder,
    currentView,
    setView
  } = useAppStore();

  const { user, logout, isAuthEnabled } = useAuthStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  
  // Track expanded folder IDs
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  // Track active menu dropdown for chats
  const [activeMenuChatId, setActiveMenuChatId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-[280px] h-full bg-card border-r border-border shrink-0" />;
  }

  // Filter chats by query
  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group chats by category (Pinned, Folder, Date groups)
  const isPinned = (id: string) => pinnedChats.includes(id);
  const isFoldered = (id: string) => folders.some(f => f.chatIds.includes(id));

  const pinnedList = filteredChats.filter(c => isPinned(c.id));
  
  // Chats not pinned and not in folders
  const unorganizedChats = filteredChats.filter(c => !isPinned(c.id) && !isFoldered(c.id));

  // Date grouping for unorganized chats
  const groupChatsByDate = (chatList: ChatSession[]) => {
    const today: ChatSession[] = [];
    const yesterday: ChatSession[] = [];
    const thisWeek: ChatSession[] = [];
    const older: ChatSession[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOfWeek = startOfToday - 7 * 24 * 60 * 60 * 1000;

    chatList.forEach((chat) => {
      const time = chat.createdAt;
      if (time >= startOfToday) {
        today.push(chat);
      } else if (time >= startOfYesterday) {
        yesterday.push(chat);
      } else if (time >= startOfWeek) {
        thisWeek.push(chat);
      } else {
        older.push(chat);
      }
    });

    return { today, yesterday, thisWeek, older };
  };

  const dateGroups = groupChatsByDate(unorganizedChats);

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim());
      setNewFolderName("");
      setShowNewFolderInput(false);
      toast.success("Folder created");
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Render a chat row
  const renderChatRow = (chat: ChatSession, extraClass = "") => {
    const isChatActive = chat.id === activeChatId;
    const menuOpen = activeMenuChatId === chat.id;
    const pinned = isPinned(chat.id);

    return (
      <div
        key={chat.id}
        onClick={() => setActiveChatId(chat.id)}
        className={cn(
          "group relative w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-all text-left cursor-pointer select-none",
          isChatActive
            ? "bg-primary/15 text-primary font-semibold border-l-2 border-primary"
            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
          extraClass
        )}
      >
        <MessageSquare className="w-4 h-4 shrink-0 opacity-70 group-hover:opacity-100" />
        <span className="truncate pr-16 font-medium flex-1 text-xs md:text-sm">{chat.title || "Untitled Chat"}</span>
        
        {/* Actions Button */}
        <div className="absolute right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePinChat(chat.id);
              toast.success(pinned ? "Chat unpinned" : "Chat pinned");
            }}
            className={cn(
              "p-1 rounded hover:bg-muted transition-colors text-muted-foreground",
              pinned && "text-amber-500 opacity-100"
            )}
            title={pinned ? "Unpin chat" : "Pin chat"}
          >
            <Pin className="w-3.5 h-3.5 fill-current" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuChatId(menuOpen ? null : chat.id);
            }}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Chat actions"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Dropdown Menu */}
        <AnimatePresence>
          {menuOpen && (
            <>
              <div 
                className="fixed inset-0 z-30" 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuChatId(null);
                }} 
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute right-2 mt-22 w-48 rounded-xl border border-border bg-card/90 backdrop-blur-md p-1 shadow-lg z-40 text-left"
              >
                <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">Organize</div>
                {folders.map(f => {
                  const inFolder = f.chatIds.includes(chat.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => {
                        if (inFolder) {
                          removeChatFromFolder(f.id, chat.id);
                          toast.info("Removed from folder");
                        } else {
                          addChatToFolder(f.id, chat.id);
                          toast.success("Added to folder");
                        }
                        setActiveMenuChatId(null);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-muted text-foreground transition-colors"
                    >
                      {inFolder ? <FolderMinus className="w-3.5 h-3.5 text-rose-500" /> : <Folder className="w-3.5 h-3.5 text-primary" />}
                      <span className="truncate">{inFolder ? "Remove from" : "Add to"} {f.name}</span>
                    </button>
                  );
                })}
                
                <div className="h-[1px] bg-border/50 my-1" />
                
                <button
                  onClick={() => {
                    deleteChat(chat.id);
                    setActiveMenuChatId(null);
                    toast.error("Chat deleted");
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-rose-500/10 text-rose-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Chat</span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <>
      <motion.div
        initial={{ width: 280 }}
        animate={{ width: sidebarOpen ? 280 : 0, opacity: sidebarOpen ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "h-full bg-card/60 backdrop-blur-md border-r border-border/80 flex flex-col transition-all overflow-hidden whitespace-nowrap z-20 shrink-0",
          !sidebarOpen && "border-none"
        )}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-border/50 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-500 via-indigo-500 to-teal-500 flex items-center justify-center shrink-0 shadow-md">
              <span className="text-white text-xs font-black">Ω</span>
            </div>
            <h2 className="font-bold text-sm tracking-wide text-foreground">AI Workspace</h2>
          </div>
          <button 
            onClick={toggleSidebar} 
            className="p-1.5 hover:bg-muted/60 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
          >
            <LayoutPanelLeft className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="p-3 space-y-2 shrink-0">
          <div className="flex gap-1 p-0.5 bg-muted/40 border border-border/40 rounded-xl select-none">
            <button
              onClick={() => setView('chat')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold cursor-pointer transition-all",
                currentView === 'chat'
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Workspace
            </button>
            <button
              onClick={() => setView('marketplace')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold cursor-pointer transition-all",
                currentView === 'marketplace'
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Wrench className="w-3.5 h-3.5" />
              Marketplace
            </button>
          </div>

          <button 
            onClick={() => { setView('chat'); createChat(); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-xs md:text-sm font-semibold transition-all shadow-sm active:scale-98 select-none cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Conversation
          </button>

          {/* Search bar */}
          <div className="relative flex items-center select-none">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search chat history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-muted/40 border border-border/60 hover:border-border/100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-ring transition-all placeholder:text-muted-foreground/70"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 p-0.5 hover:bg-muted rounded-full"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Folders and Chats List */}
        <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-4 scrollbar-thin select-none">
          {/* Folders Section Header */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-1 select-none">
              <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Folders</span>
              <button 
                onClick={() => setShowNewFolderInput(!showNewFolderInput)}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                title="Create folder"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Folder creation input */}
            <AnimatePresence>
              {showNewFolderInput && (
                <motion.form 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleCreateFolderSubmit}
                  className="px-2 py-1.5 flex gap-1 items-center bg-muted/30 rounded-xl border border-border/40"
                >
                  <input
                    type="text"
                    autoFocus
                    placeholder="Folder name..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="flex-1 bg-transparent border-none text-xs outline-none text-foreground py-0.5"
                  />
                  <button 
                    type="submit" 
                    className="p-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded text-[10px] font-semibold transition-colors"
                  >
                    Create
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Folders list */}
            <div className="space-y-0.5">
              {folders.map(folder => {
                const isExpanded = !!expandedFolders[folder.id];
                // Gather chats in folder
                const folderChats = filteredChats.filter(c => folder.chatIds.includes(c.id));

                return (
                  <div key={folder.id} className="rounded-xl overflow-hidden bg-muted/15 border border-border/10">
                    <div 
                      onClick={() => toggleFolder(folder.id)}
                      className="flex items-center justify-between px-2.5 py-2 hover:bg-muted/40 transition-colors cursor-pointer text-xs font-semibold text-foreground/80"
                    >
                      <div className="flex items-center gap-2 truncate min-w-0">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                        <Folder className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{folder.name}</span>
                        <span className="text-[10px] text-muted-foreground/60">({folderChats.length})</span>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFolder(folder.id);
                          toast.error("Folder deleted");
                        }}
                        className="p-0.5 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 rounded transition-colors"
                        title="Delete folder"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="pl-3.5 border-l border-primary/20 pb-1.5 space-y-0.5 mt-0.5"
                        >
                          {folderChats.length === 0 ? (
                            <div className="text-[10px] text-muted-foreground/60 italic p-2">
                              Folder is empty
                            </div>
                          ) : (
                            folderChats.map(c => renderChatRow(c, "py-1.5"))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pinned section */}
          {pinnedList.length > 0 && (
            <div className="space-y-0.5">
              <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider px-2 py-1 flex items-center gap-1">
                <Pin className="w-3 h-3 fill-current text-amber-500" />
                <span>Favorites</span>
              </div>
              {pinnedList.map(c => renderChatRow(c))}
            </div>
          )}

          {/* Recent section */}
          <div className="space-y-3">
            {/* Today */}
            {dateGroups.today.length > 0 && (
              <div className="space-y-0.5">
                <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider px-2 py-1">Today</div>
                {dateGroups.today.map(c => renderChatRow(c))}
              </div>
            )}

            {/* Yesterday */}
            {dateGroups.yesterday.length > 0 && (
              <div className="space-y-0.5">
                <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider px-2 py-1">Yesterday</div>
                {dateGroups.yesterday.map(c => renderChatRow(c))}
              </div>
            )}

            {/* This Week */}
            {dateGroups.thisWeek.length > 0 && (
              <div className="space-y-0.5">
                <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider px-2 py-1">This Week</div>
                {dateGroups.thisWeek.map(c => renderChatRow(c))}
              </div>
            )}

            {/* Older */}
            {dateGroups.older.length > 0 && (
              <div className="space-y-0.5">
                <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider px-2 py-1">Older</div>
                {dateGroups.older.map(c => renderChatRow(c))}
              </div>
            )}

            {filteredChats.length === 0 && (
              <div className="text-center py-8 text-xs text-muted-foreground/60 italic">
                {searchQuery ? "No matching chats found" : "No chats yet"}
              </div>
            )}
          </div>
        </div>

        {/* Footer Area */}
        <div className="p-3 border-t border-border/50 shrink-0 bg-muted/10 flex flex-col gap-2 select-none">
          <div className="flex items-center justify-between select-none">
            {/* User Profile avatar */}
            <div className="flex items-center gap-2 max-w-[170px] truncate">
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center font-bold text-xs text-purple-400 uppercase shrink-0">
                {user?.username?.charAt(0) || "U"}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-foreground leading-tight truncate">{user?.username || "Guest User"}</span>
                <span className="text-[10px] text-muted-foreground leading-none truncate">{user?.email || "guest@local"}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              {isAuthEnabled && (
                <button 
                  onClick={logout} 
                  className="text-[10px] text-zinc-500 hover:text-rose-400 cursor-pointer transition-colors font-medium border border-white/5 hover:border-rose-500/20 px-2 py-1 rounded-lg bg-zinc-950/20 shrink-0"
                >
                  Logout
                </button>
              )}
              <ThemeToggle />
            </div>
          </div>

          <button 
            onClick={() => setSettingsOpen(true)} 
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all text-left font-semibold cursor-pointer"
          >
            <Settings className="w-4.5 h-4.5 shrink-0" />
            Settings Console
          </button>
        </div>
      </motion.div>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
