"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Plug, Lock } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export type MCPServer = {
  id: string;
  url: string;
  label?: string;
  token?: string;
};

interface MCPManagerProps {
  onChange?: (servers: MCPServer[]) => void;
}

export function MCPManager({ onChange }: MCPManagerProps) {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("mcp-servers");
    if (saved) {
      const parsed = JSON.parse(saved);
      setServers(parsed);
      onChange?.(parsed);
    }
  }, []);

  const save = (updated: MCPServer[]) => {
    setServers(updated);
    localStorage.setItem("mcp-servers", JSON.stringify(updated));
    onChange?.(updated);
  };

  const add = () => {
    if (!url.trim()) return;
    const updated = [
      ...servers,
      {
        id: crypto.randomUUID(),
        url: url.trim(),
        label: label.trim() || undefined,
        token: token.trim() || undefined,
      },
    ];
    save(updated);
    setUrl("");
    setLabel("");
    setToken("");
  };

  const remove = (id: string) => save(servers.filter((s) => s.id !== id));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Plug className="size-3.5" />
          <span className="text-xs">MCP</span>
          {servers.length > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              {servers.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="end">
        <p className="text-xs font-medium mb-2 text-muted-foreground">MCP Servers</p>

        <div className="flex flex-col gap-1.5 mb-3">
          {servers.length === 0 && (
            <p className="text-xs text-muted-foreground py-1">No servers added.</p>
          )}
          {servers.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  {s.label && <p className="text-xs font-medium truncate">{s.label}</p>}
                  {s.token && <Lock className="size-2.5 text-muted-foreground shrink-0" />}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{s.url}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                onClick={() => remove(s.id)}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <Input
            placeholder="Label (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="h-7 text-xs"
          />
          <Input
            placeholder="Bearer token (optional)"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="h-7 text-xs"
          />
          <Input
            placeholder="https://your-mcp-server.com/mcp"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            className="h-7 text-xs"
          />
          <Button size="sm" className="h-7 gap-1.5" onClick={add} disabled={!url.trim()}>
            <Plus className="size-3" />
            Add Server
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
