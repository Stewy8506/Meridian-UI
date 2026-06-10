"use client";

import { useAppStore, ChatSession, ChatFolder } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { 
  Plus, Trash2, Pin, Search, 
  ChevronDown, ChevronRight, MoreVertical, X, FolderMinus, 
  Settings, LogOut, FolderPlus, Folder
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
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [activeMenuChatId, setActiveMenuChatId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-[272px] h-full bg-card border-r border-border shrink-0" />;
  }

  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isPinned = (id: string) => pinnedChats.includes(id);
  const isFoldered = (id: string) => folders.some(f => f.chatIds.includes(id));

  const pinnedList = filteredChats.filter(c => isPinned(c.id));
  const unorganizedChats = filteredChats.filter(c => !isPinned(c.id) && !isFoldered(c.id));

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
      if (time >= startOfToday) today.push(chat);
      else if (time >= startOfYesterday) yesterday.push(chat);
      else if (time >= startOfWeek) thisWeek.push(chat);
      else older.push(chat);
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

  const renderChatRow = (chat: ChatSession, extraClass = "") => {
    const isChatActive = chat.id === activeChatId;
    const menuOpen = activeMenuChatId === chat.id;
    const pinned = isPinned(chat.id);

    return (
      <div
        key={chat.id}
        onClick={() => setActiveChatId(chat.id)}
        className={cn(
          "group relative w-full flex items-center px-3 py-2 text-[13px] rounded-lg transition-colors text-left cursor-pointer select-none",
          isChatActive
            ? "bg-accent text-foreground font-medium"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
          extraClass
        )}
      >
        <span className="truncate pr-14 flex-1">{chat.title || "Untitled"}</span>
        
        {/* Hover actions */}
        <div className="absolute right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePinChat(chat.id);
              toast.success(pinned ? "Unpinned" : "Pinned");
            }}
            className={cn(
              "p-1 rounded-md hover:bg-muted transition-colors",
              pinned ? "text-foreground opacity-100" : "text-muted-foreground"
            )}
            title={pinned ? "Unpin" : "Pin"}
          >
            <Pin className="w-3 h-3" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuChatId(menuOpen ? null : chat.id);
            }}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="More"
          >
            <MoreVertical className="w-3 h-3" />
          </button>
        </div>

        {/* Context menu */}
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
                initial={{ opacity: 0, scale: 0.96, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 4 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute right-2 mt-24 w-44 rounded-lg border border-border bg-popover p-1 shadow-lg z-40 text-left"
              >
                <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Organize</div>
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
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-accent text-foreground transition-colors"
                    >
                      {inFolder ? <FolderMinus className="w-3.5 h-3.5 text-muted-foreground" /> : <Folder className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span className="truncate">{inFolder ? "Remove from" : "Move to"} {f.name}</span>
                    </button>
                  );
                })}
                
                <div className="h-px bg-border my-1" />
                
                <button
                  onClick={() => {
                    deleteChat(chat.id);
                    setActiveMenuChatId(null);
                    toast.error("Deleted");
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-destructive/10 text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.1em] px-3 py-1.5">
      {children}
    </div>
  );

  return (
    <>
      <motion.div
        initial={{ width: 272 }}
        animate={{ width: sidebarOpen ? 272 : 0, opacity: sidebarOpen ? 1 : 0 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={cn(
          "h-full bg-card border-r border-border flex flex-col overflow-hidden whitespace-nowrap z-20 shrink-0",
          !sidebarOpen && "border-none"
        )}
      >
        {/* Header */}
        <div className="px-4 py-4 flex items-center justify-between shrink-0 select-none">
          <h2 className="font-semibold text-sm tracking-tight text-foreground">AI Workspace</h2>
          <button 
            onClick={toggleSidebar} 
            className="p-1 hover:bg-accent text-muted-foreground hover:text-foreground rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Tabs */}
        <div className="px-3 pb-2 shrink-0">
          <div className="flex gap-1 select-none">
            {([
              { id: 'chat', label: 'Chat' },
              { id: 'marketplace', label: 'Skills' },
              { id: 'knowledge', label: 'Files' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={cn(
                  "flex-1 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors",
                  currentView === tab.id
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* New Chat + Search */}
        <div className="px-3 pb-3 space-y-2 shrink-0">
          <button 
            onClick={() => { setView('chat'); createChat(); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-border hover:border-foreground/30 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-all select-none cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New conversation
          </button>

          <div className="relative flex items-center">
            <Search className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-transparent border-b border-border text-xs outline-none focus:border-foreground/30 transition-colors placeholder:text-muted-foreground/50"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-2 p-0.5 hover:bg-accent rounded"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-3 select-none">
          
          {/* Folders */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between px-3 py-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.1em]">Folders</span>
              <button 
                onClick={() => setShowNewFolderInput(!showNewFolderInput)}
                className="p-0.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
                title="New folder"
              >
                <FolderPlus className="w-3 h-3" />
              </button>
            </div>

            <AnimatePresence>
              {showNewFolderInput && (
                <motion.form 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleCreateFolderSubmit}
                  className="px-3 py-1.5 flex gap-1.5 items-center"
                >
                  <input
                    type="text"
                    autoFocus
                    placeholder="Folder name..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="flex-1 bg-transparent border-b border-border text-xs outline-none text-foreground py-0.5 focus:border-foreground/30"
                  />
                  <button 
                    type="submit" 
                    className="px-2 py-0.5 bg-foreground text-background hover:bg-foreground/90 rounded text-[10px] font-medium transition-colors"
                  >
                    Create
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="space-y-0.5">
              {folders.map(folder => {
                const isExpanded = !!expandedFolders[folder.id];
                const folderChats = filteredChats.filter(c => folder.chatIds.includes(c.id));

                return (
                  <div key={folder.id}>
                    <div 
                      onClick={() => toggleFolder(folder.id)}
                      className="flex items-center justify-between px-3 py-1.5 hover:bg-accent/50 transition-colors cursor-pointer text-xs text-foreground/80 rounded-md"
                    >
                      <div className="flex items-center gap-1.5 truncate min-w-0">
                        {isExpanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
                        <span className="truncate font-medium">{folder.name}</span>
                        <span className="text-[10px] text-muted-foreground">{folderChats.length}</span>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFolder(folder.id);
                          toast.error("Folder deleted");
                        }}
                        className="p-0.5 hover:bg-accent text-muted-foreground hover:text-destructive rounded transition-colors opacity-0 group-hover:opacity-100"
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
                          className="ml-3 border-l border-border pl-1 pb-1 space-y-0.5"
                        >
                          {folderChats.length === 0 ? (
                            <div className="text-[10px] text-muted-foreground/50 italic px-3 py-1.5">
                              Empty
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

          {/* Pinned */}
          {pinnedList.length > 0 && (
            <div className="space-y-0.5">
              <SectionLabel>Pinned</SectionLabel>
              {pinnedList.map(c => renderChatRow(c))}
            </div>
          )}

          {/* Date groups */}
          <div className="space-y-3">
            {dateGroups.today.length > 0 && (
              <div className="space-y-0.5">
                <SectionLabel>Today</SectionLabel>
                {dateGroups.today.map(c => renderChatRow(c))}
              </div>
            )}

            {dateGroups.yesterday.length > 0 && (
              <div className="space-y-0.5">
                <SectionLabel>Yesterday</SectionLabel>
                {dateGroups.yesterday.map(c => renderChatRow(c))}
              </div>
            )}

            {dateGroups.thisWeek.length > 0 && (
              <div className="space-y-0.5">
                <SectionLabel>This week</SectionLabel>
                {dateGroups.thisWeek.map(c => renderChatRow(c))}
              </div>
            )}

            {dateGroups.older.length > 0 && (
              <div className="space-y-0.5">
                <SectionLabel>Older</SectionLabel>
                {dateGroups.older.map(c => renderChatRow(c))}
              </div>
            )}

            {filteredChats.length === 0 && (
              <div className="text-center py-8 text-xs text-muted-foreground/50">
                {searchQuery ? "No results" : "No conversations yet"}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-border shrink-0 space-y-2 select-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 truncate">
              <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center text-[10px] font-semibold text-foreground uppercase shrink-0">
                {user?.username?.charAt(0) || "U"}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-foreground leading-tight truncate">{user?.username || "Guest"}</span>
                <span className="text-[10px] text-muted-foreground leading-none truncate">{user?.email || "guest@local"}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {isAuthEnabled && (
                <button 
                  onClick={logout} 
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
              <ThemeToggle />
            </div>
          </div>

          <button 
            onClick={() => setSettingsOpen(true)} 
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors text-left font-medium cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 shrink-0" />
            Settings
          </button>
        </div>
      </motion.div>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
