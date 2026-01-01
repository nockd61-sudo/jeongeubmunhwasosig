import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  RefreshCw,
  Settings,
  Database,
  Globe,
  Rss,
  Key,
  ArrowLeft,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ExternalSource {
  id: string;
  name: string;
  type: "webpage" | "rss" | "api";
  url: string;
  apiKey?: string;
  enabled: boolean;
  lastSync?: string;
}

interface SourcesResponse {
  sources: ExternalSource[];
  lastSync: string | null;
}

interface SyncResult {
  success: boolean;
  message: string;
  events: number;
  news: number;
  lastSync: string;
}

function SourceIcon({ type }: { type: ExternalSource["type"] }) {
  switch (type) {
    case "webpage":
      return <Globe className="h-5 w-5" />;
    case "rss":
      return <Rss className="h-5 w-5" />;
    case "api":
      return <Key className="h-5 w-5" />;
    default:
      return <Database className="h-5 w-5" />;
  }
}

function SourceCard({
  source,
  onToggle,
  onUpdate,
}: {
  source: ExternalSource;
  onToggle: (id: string, enabled: boolean) => void;
  onUpdate: (id: string, updates: Partial<ExternalSource>) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(source.apiKey || "");

  const handleSaveApiKey = () => {
    onUpdate(source.id, { apiKey: apiKeyInput });
    setIsEditing(false);
  };

  return (
    <Card className={source.enabled ? "" : "opacity-60"} data-testid={`card-source-${source.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
              <SourceIcon type={source.type} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold" data-testid={`text-source-name-${source.id}`}>{source.name}</h3>
                <Badge variant="outline" className="text-xs">
                  {source.type === "webpage" ? "웹페이지" : source.type === "rss" ? "RSS" : "API"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1 break-all">
                {source.url}
              </p>
              {source.lastSync && (
                <p className="text-xs text-muted-foreground mt-2">
                  마지막 동기화: {format(new Date(source.lastSync), "yyyy.MM.dd HH:mm", { locale: ko })}
                </p>
              )}
            </div>
          </div>
          <Switch
            checked={source.enabled}
            onCheckedChange={(checked) => onToggle(source.id, checked)}
            data-testid={`switch-source-${source.id}`}
          />
        </div>

        {source.type === "api" && (
          <div className="mt-4 pt-4 border-t">
            {isEditing ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor={`api-key-${source.id}`}>API 키</Label>
                  <Input
                    id={`api-key-${source.id}`}
                    type="password"
                    placeholder="공공데이터포털 API 키 입력"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    data-testid={`input-api-key-${source.id}`}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveApiKey} data-testid={`button-save-api-key-${source.id}`}>
                    저장
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {source.apiKey && source.apiKey.includes("***") ? "API 키 설정됨" : "API 키가 필요합니다"}
                </span>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} data-testid={`button-edit-api-key-${source.id}`}>
                  {source.apiKey && source.apiKey.includes("***") ? "수정" : "설정"}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Admin() {
  const { toast } = useToast();

  const { data: sourcesData, isLoading } = useQuery<SourcesResponse>({
    queryKey: ["/api/sources"],
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      return apiRequest("PATCH", `/api/sources/${id}`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ExternalSource> }) => {
      return apiRequest("PATCH", `/api/sources/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      toast({
        title: "저장 완료",
        description: "설정이 저장되었습니다.",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sync");
      return await response.json() as SyncResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({
        title: "동기화 완료",
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: "동기화 실패",
        description: "데이터 동기화 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (id: string, enabled: boolean) => {
    toggleMutation.mutate({ id, enabled });
  };

  const handleUpdate = (id: string, updates: Partial<ExternalSource>) => {
    updateMutation.mutate({ id, updates });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between gap-4 h-16">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <h1 className="font-bold text-lg">데이터 소스 관리</h1>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              외부 데이터 동기화
            </CardTitle>
            <CardDescription>
              정읍시 홈페이지, 공공데이터, RSS 피드에서 최신 데이터를 가져옵니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                {sourcesData?.lastSync ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    마지막 동기화: {format(new Date(sourcesData.lastSync), "yyyy.MM.dd HH:mm", { locale: ko })}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    아직 동기화가 실행되지 않았습니다
                  </p>
                )}
              </div>
              <Button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                data-testid="button-sync"
              >
                {syncMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    동기화 중...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    지금 동기화
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">데이터 소스</h2>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="w-10 h-10 rounded-md" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-40 mb-2" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {sourcesData?.sources.map((source) => (
                <SourceCard
                  key={source.id}
                  source={source}
                  onToggle={handleToggle}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          )}
        </div>

        <Card className="mt-8 bg-muted/50">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">공공데이터포털 API 사용 안내</h3>
            <p className="text-sm text-muted-foreground mb-4">
              전국 문화축제 데이터를 가져오려면 공공데이터포털(data.go.kr)에서 API 키를 발급받아야 합니다.
            </p>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>data.go.kr 회원가입</li>
              <li>"전국문화축제표준데이터" 검색</li>
              <li>활용신청 후 API 키 발급</li>
              <li>위 API 소스에 키 입력</li>
            </ol>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
