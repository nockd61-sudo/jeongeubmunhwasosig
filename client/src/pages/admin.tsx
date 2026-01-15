import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Bot,
  Plus,
  Calendar,
  MapPin,
  Trash2,
  Pencil,
  ImagePlus,
  Upload,
  Link2,
  X,
  Video,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { GuestPost, PostStatus, CulturalEvent, NewsItem } from "@shared/schema";
import { insertEventSchema, insertNewsSchema, insertGuestPostSchema } from "@shared/schema";

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

interface AiSyncResult {
  success: boolean;
  message: string;
  totalFetched: number;
  jeongeupRelated: number;
  summarized: number;
  added: number;
  errors: string[];
}

function GuestPostCard({
  post,
  onApprove,
  onReject,
  isUpdating,
}: {
  post: GuestPost;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isUpdating: boolean;
}) {
  const typeLabels: Record<string, string> = {
    event: "행사",
    news: "소식",
    general: "일반",
    inquiry: "문의",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500",
    approved: "bg-green-500",
    rejected: "bg-red-500",
  };

  const statusLabels: Record<string, string> = {
    pending: "대기중",
    approved: "승인됨",
    rejected: "거절됨",
  };

  return (
    <Card data-testid={`card-guest-post-${post.id}`}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {typeLabels[post.type] || post.type}
                </Badge>
                <Badge className={`text-xs ${statusColors[post.status] || "bg-gray-500"} text-white`}>
                  {statusLabels[post.status] || post.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {post.authorName}
                  {post.authorContact && ` (${post.authorContact})`}
                </span>
              </div>
              <h4 className="font-medium" data-testid={`text-guest-post-title-${post.id}`}>
                {post.title}
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {post.content}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                등록일: {post.createdAt ? format(new Date(post.createdAt), "yyyy.MM.dd HH:mm", { locale: ko }) : "-"}
              </p>
            </div>
          </div>
          {post.status === "pending" && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => onApprove(post.id)}
                disabled={isUpdating}
                className="gap-1"
                data-testid={`button-approve-${post.id}`}
              >
                <CheckCircle className="h-4 w-4" />
                승인
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(post.id)}
                disabled={isUpdating}
                className="gap-1"
                data-testid={`button-reject-${post.id}`}
              >
                <XCircle className="h-4 w-4" />
                거절
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AdminImageUploadField({ form }: { form: any }) {
  const [uploadMode, setUploadMode] = useState<"url" | "file">("url");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("파일 크기는 2MB 이하여야 합니다");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setUploadError("이미지 파일만 업로드 가능합니다");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const response = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });

      if (!response.ok) throw new Error("업로드 URL 생성 실패");

      const { uploadURL, objectPath } = await response.json();

      await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      form.setValue("imageUrl", objectPath);
    } catch (error) {
      setUploadError("이미지 업로드에 실패했습니다");
    } finally {
      setIsUploading(false);
    }
  };

  const imageValue = form.watch("imageUrl");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <ImagePlus className="h-4 w-4" />
          이미지 (선택)
        </Label>
        <div className="flex gap-1">
          <Button
            type="button"
            variant={uploadMode === "url" ? "default" : "outline"}
            size="sm"
            onClick={() => setUploadMode("url")}
            className="gap-1 h-7 text-xs"
          >
            <Link2 className="h-3 w-3" />
            URL
          </Button>
          <Button
            type="button"
            variant={uploadMode === "file" ? "default" : "outline"}
            size="sm"
            onClick={() => setUploadMode("file")}
            className="gap-1 h-7 text-xs"
          >
            <Upload className="h-3 w-3" />
            파일
          </Button>
        </div>
      </div>

      {uploadMode === "url" ? (
        <Input
          placeholder="https://example.com/image.jpg"
          value={imageValue || ""}
          onChange={(e) => form.setValue("imageUrl", e.target.value)}
          data-testid="input-event-image-url"
        />
      ) : (
        <div>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
              className="flex-1"
              data-testid="input-event-image-file"
            />
            {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          {uploadError && (
            <p className="text-xs text-destructive mt-1">{uploadError}</p>
          )}
        </div>
      )}

      {imageValue && (
        <div className="mt-2 rounded-md border overflow-hidden relative">
          <img
            src={imageValue}
            alt="미리보기"
            className="w-full h-24 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 bg-background/80"
            onClick={() => form.setValue("imageUrl", "")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function EventManager() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CulturalEvent | null>(null);

  const { data: events = [], isLoading } = useQuery<CulturalEvent[]>({
    queryKey: ["/api/events"],
  });

  const form = useForm({
    resolver: zodResolver(insertEventSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "문화행사" as const,
      imageUrl: "",
      videoUrl: "",
      startDate: "",
      endDate: "",
      location: "",
      isFeatured: false,
    },
  });

  const openEditDialog = (event: CulturalEvent) => {
    setEditingEvent(event);
    form.reset({
      title: event.title,
      description: event.description,
      category: event.category as any,
      imageUrl: event.imageUrl || "",
      videoUrl: event.videoUrl || "",
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.location,
      isFeatured: event.isFeatured || false,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingEvent(null);
    form.reset({
      title: "",
      description: "",
      category: "문화행사",
      imageUrl: "",
      videoUrl: "",
      startDate: "",
      endDate: "",
      location: "",
      isFeatured: false,
    });
    setIsDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/events", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "행사 등록 완료", description: "새 행사가 등록되었습니다." });
      form.reset();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: "등록 실패", description: "행사 등록에 실패했습니다.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/events/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "수정 완료", description: "행사가 수정되었습니다." });
      form.reset();
      setEditingEvent(null);
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: "수정 실패", description: "행사 수정에 실패했습니다.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "삭제 완료", description: "행사가 삭제되었습니다." });
    },
    onError: () => {
      toast({ title: "삭제 실패", description: "행사 삭제에 실패했습니다.", variant: "destructive" });
    },
  });

  const onSubmit = (data: any) => {
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const categories = ["문화행사", "축제", "전시", "공연", "기타소식"];

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              행사 관리
            </CardTitle>
            <CardDescription>
              문화행사, 축제, 전시, 공연 등을 등록하고 관리합니다.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingEvent(null);
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-event" onClick={openCreateDialog}>
                <Plus className="h-4 w-4" />
                행사 등록
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEvent ? "행사 수정" : "새 행사 등록"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>행사명 *</FormLabel>
                        <FormControl>
                          <Input placeholder="행사 제목" {...field} data-testid="input-event-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>설명 *</FormLabel>
                        <FormControl>
                          <Textarea placeholder="행사 설명" rows={3} {...field} data-testid="input-event-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>카테고리 *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-event-category">
                              <SelectValue placeholder="카테고리 선택" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>시작일 *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-event-start-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>종료일 *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-event-end-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>장소 *</FormLabel>
                        <FormControl>
                          <Input placeholder="행사 장소" {...field} data-testid="input-event-location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <AdminImageUploadField form={form} />
                  <FormField
                    control={form.control}
                    name="videoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          스케치 영상 URL (선택)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://youtube.com/watch?v=... 또는 영상 URL"
                            {...field}
                            data-testid="input-event-video-url"
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          유튜브, 네이버TV 등 영상 링크를 입력하세요
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isFeatured"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-event-featured"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">메인 슬라이더에 표시</FormLabel>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isPending}
                    data-testid="button-submit-event"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {editingEvent ? "수정 중..." : "등록 중..."}
                      </>
                    ) : (
                      editingEvent ? "수정하기" : "등록하기"
                    )}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">등록된 행사가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 p-3 border rounded-md"
                data-testid={`card-event-${event.id}`}
              >
                {event.imageUrl && (
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium truncate">{event.title}</h4>
                    <Badge variant="outline" className="text-xs">{event.category}</Badge>
                    {event.isFeatured && <Badge className="text-xs">메인</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {event.startDate} ~ {event.endDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(event)}
                    data-testid={`button-edit-event-${event.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(event.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-event-${event.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NewsManager() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: newsItems = [], isLoading } = useQuery<NewsItem[]>({
    queryKey: ["/api/news"],
  });

  const form = useForm({
    resolver: zodResolver(insertNewsSchema),
    defaultValues: {
      title: "",
      summary: "",
      category: "기타소식" as const,
      imageUrl: "",
      publishedAt: new Date().toISOString().split("T")[0],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/news", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({ title: "뉴스 등록 완료", description: "새 뉴스가 등록되었습니다." });
      form.reset();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: "등록 실패", description: "뉴스 등록에 실패했습니다.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/news/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({ title: "삭제 완료", description: "뉴스가 삭제되었습니다." });
    },
    onError: () => {
      toast({ title: "삭제 실패", description: "뉴스 삭제에 실패했습니다.", variant: "destructive" });
    },
  });

  const onSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  const categories = ["문화행사", "축제", "전시", "공연", "기타소식"];

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              뉴스/소식 관리
            </CardTitle>
            <CardDescription>
              기타소식 및 뉴스를 등록하고 관리합니다.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-news">
                <Plus className="h-4 w-4" />
                뉴스 등록
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>새 뉴스 등록</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>제목 *</FormLabel>
                        <FormControl>
                          <Input placeholder="뉴스 제목" {...field} data-testid="input-news-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="summary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>요약 *</FormLabel>
                        <FormControl>
                          <Textarea placeholder="뉴스 요약" rows={3} {...field} data-testid="input-news-summary" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>카테고리 *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-news-category">
                              <SelectValue placeholder="카테고리 선택" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="publishedAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>게시일 *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-news-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <AdminImageUploadField form={form} />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createMutation.isPending}
                    data-testid="button-submit-news"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        등록 중...
                      </>
                    ) : (
                      "등록하기"
                    )}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : newsItems.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">등록된 뉴스가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {newsItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 border rounded-md"
                data-testid={`card-news-${item.id}`}
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-12 h-12 object-cover rounded-md flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium truncate text-sm">{item.title}</h4>
                    <Badge variant="outline" className="text-xs">{item.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-1">{item.summary}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.publishedAt}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(item.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-news-${item.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AdminPostForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(insertGuestPostSchema),
    defaultValues: {
      type: "general" as const,
      title: "",
      content: "",
      category: "",
      authorName: "관리자",
      authorContact: "",
      imageUrl: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/guest-posts", {
        ...data,
        autoApprove: true,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guest-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guest-posts/approved"] });
      toast({
        title: "게시글 등록 완료",
        description: "게시글이 바로 공개되었습니다.",
      });
      form.reset();
      setIsOpen(false);
      onSuccess();
    },
    onError: () => {
      toast({
        title: "오류 발생",
        description: "게시글 등록에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: Record<string, unknown>) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-admin-post">
          <Plus className="h-4 w-4" />
          관리자 글쓰기
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>관리자 게시글 등록</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>유형</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-admin-post-type">
                        <SelectValue placeholder="유형 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="event">행사</SelectItem>
                      <SelectItem value="news">소식</SelectItem>
                      <SelectItem value="general">일반</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제목</FormLabel>
                  <FormControl>
                    <Input placeholder="제목을 입력하세요" {...field} data-testid="input-admin-post-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>내용</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="내용을 입력하세요" 
                      className="min-h-[120px]"
                      {...field} 
                      data-testid="input-admin-post-content"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="authorName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>작성자</FormLabel>
                  <FormControl>
                    <Input placeholder="작성자명" {...field} data-testid="input-admin-post-author" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full" 
              disabled={createMutation.isPending}
              data-testid="button-submit-admin-post"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              등록하기 (바로 공개)
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function GuestPostsManager() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("pending");

  const { data: posts = [], isLoading } = useQuery<GuestPost[]>({
    queryKey: ["/api/guest-posts"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PostStatus }) => {
      const res = await apiRequest("PATCH", `/api/guest-posts/${id}/status`, { status });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/guest-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guest-posts/approved"] });
      toast({
        title: variables.status === "approved" ? "승인 완료" : "거절 완료",
        description: variables.status === "approved" 
          ? "게시글이 승인되어 공개됩니다." 
          : "게시글이 거절되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류 발생",
        description: "상태 변경에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (id: string) => {
    updateStatusMutation.mutate({ id, status: "approved" });
  };

  const handleReject = (id: string) => {
    updateStatusMutation.mutate({ id, status: "rejected" });
  };

  const pendingPosts = posts.filter((p) => p.status === "pending");
  const approvedPosts = posts.filter((p) => p.status === "approved");
  const rejectedPosts = posts.filter((p) => p.status === "rejected");

  const renderPosts = (filteredPosts: GuestPost[], emptyMessage: string) => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (filteredPosts.length === 0) {
      return (
        <div className="text-center py-8">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filteredPosts.map((post) => (
          <GuestPostCard
            key={post.id}
            post={post}
            onApprove={handleApprove}
            onReject={handleReject}
            isUpdating={updateStatusMutation.isPending}
          />
        ))}
      </div>
    );
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/guest-posts"] });
    queryClient.invalidateQueries({ queryKey: ["/api/guest-posts/approved"] });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              게시글 관리
            </CardTitle>
            <CardDescription className="mt-1">
              방문자가 등록한 게시글을 승인하거나 거절할 수 있습니다.
            </CardDescription>
          </div>
          <AdminPostForm onSuccess={handleRefresh} />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="gap-1" data-testid="tab-pending">
              <Clock className="h-4 w-4" />
              대기중 ({pendingPosts.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-1" data-testid="tab-approved">
              <CheckCircle className="h-4 w-4" />
              승인됨 ({approvedPosts.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-1" data-testid="tab-rejected">
              <XCircle className="h-4 w-4" />
              거절됨 ({rejectedPosts.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-4">
            {renderPosts(pendingPosts, "대기 중인 게시글이 없습니다.")}
          </TabsContent>
          <TabsContent value="approved" className="mt-4">
            {renderPosts(approvedPosts, "승인된 게시글이 없습니다.")}
          </TabsContent>
          <TabsContent value="rejected" className="mt-4">
            {renderPosts(rejectedPosts, "거절된 게시글이 없습니다.")}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
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

  const aiSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai-news/sync");
      return await response.json() as AiSyncResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({
        title: "AI 뉴스 수집 완료",
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: "AI 뉴스 수집 실패",
        description: "뉴스 수집 중 오류가 발생했습니다.",
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
                <h1 className="font-bold text-lg">관리자 페이지</h1>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <EventManager />
        <NewsManager />
        <GuestPostsManager />
        
        <div className="mt-8" />

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI 뉴스 자동 수집
              <Badge variant="secondary" className="ml-2">
                <Sparkles className="h-3 w-3 mr-1" />
                AI
              </Badge>
            </CardTitle>
            <CardDescription>
              RSS 피드에서 정읍 관련 뉴스를 수집하고 AI가 자동으로 요약합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                <p>전북일보, 정읍신문 등에서 정읍 관련 기사를 자동 수집합니다.</p>
                <p className="mt-1">수집된 뉴스는 AI가 한국어로 요약하여 표시합니다.</p>
              </div>
              <Button
                onClick={() => aiSyncMutation.mutate()}
                disabled={aiSyncMutation.isPending}
                className="gap-2"
                data-testid="button-ai-sync"
              >
                {aiSyncMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI 수집 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    AI 뉴스 수집
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        
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
