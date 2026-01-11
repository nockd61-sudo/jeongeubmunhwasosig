import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import useEmblaCarousel from "embla-carousel-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Link } from "wouter";
import {
  Search,
  Bell,
  Menu,
  Calendar,
  MapPin,
  Heart,
  Share2,
  ChevronRight,
  Building2,
  CalendarCheck,
  Info,
  Phone,
  X,
  Settings,
  PenLine,
  Send,
  Loader2,
  MessageSquarePlus,
  Users,
  History,
  ImagePlus,
  Upload,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CulturalEvent, NewsItem, EventCategory, GuestPost } from "@shared/schema";
import { insertGuestPostSchema } from "@shared/schema";

const categories: EventCategory[] = ["문화행사", "축제", "전시", "공연", "기타소식"];

const quickLinks = [
  { id: "1", title: "문화시설", icon: Building2, url: "#", action: null },
  { id: "2", title: "온라인예약", icon: CalendarCheck, url: "#", action: null },
  { id: "3", title: "관광정보", icon: Info, url: "#", action: null },
  { id: "4", title: "문의하기", icon: PenLine, url: "#", action: "inquiry" as const },
];

function Header({
  onMenuToggle,
  isMenuOpen,
}: {
  onMenuToggle: () => void;
  isMenuOpen: boolean;
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between gap-4 h-16">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onMenuToggle}
              data-testid="button-mobile-menu"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">정읍</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-lg leading-tight" data-testid="text-site-title">정읍에서뭐하지</h1>
                <p className="text-xs text-muted-foreground">친절한 세웅씨가 운영하는 정읍 커뮤니티</p>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="행사, 축제, 소식 검색..."
                className="pl-10 w-full"
                data-testid="input-search"
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              data-testid="button-mobile-search"
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" data-testid="button-notifications">
              <Bell className="h-5 w-5" />
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {isSearchOpen && (
          <div className="md:hidden pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="행사, 축제, 소식 검색..."
                className="pl-10 w-full"
                data-testid="input-search-mobile"
              />
            </div>
          </div>
        )}

        <nav className="hidden md:flex items-center gap-1 pb-2 overflow-x-auto">
          {categories.map((category) => (
            <Button
              key={category}
              variant="ghost"
              size="sm"
              className="whitespace-nowrap"
              data-testid={`button-nav-${category}`}
            >
              {category}
            </Button>
          ))}
        </nav>
      </div>
    </header>
  );
}

function MobileMenu({ isOpen }: { isOpen: boolean }) {
  if (!isOpen) return null;

  return (
    <div className="md:hidden fixed inset-x-0 top-16 z-40 bg-background border-b shadow-lg">
      <nav className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col gap-1">
          {categories.map((category) => (
            <Button
              key={category}
              variant="ghost"
              className="justify-start"
              data-testid={`button-mobile-nav-${category}`}
            >
              {category}
            </Button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function HeroSection({ events }: { events: CulturalEvent[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    
    const autoplay = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);

    return () => {
      emblaApi.off("select", onSelect);
      clearInterval(autoplay);
    };
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  const heroEvents = events.slice(0, 5);

  if (heroEvents.length === 0) {
    return (
      <section className="relative h-[400px] md:h-[500px] bg-muted">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="max-w-7xl mx-auto">
            <Skeleton className="h-6 w-24 mb-4" />
            <Skeleton className="h-10 w-3/4 mb-4" />
            <Skeleton className="h-5 w-1/2 mb-6" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative h-[400px] md:h-[500px] overflow-hidden">
      <div className="overflow-hidden h-full" ref={emblaRef}>
        <div className="flex h-full">
          {heroEvents.map((event, index) => (
            <div key={event.id} className="flex-[0_0_100%] min-w-0 relative h-full">
              <img
                src={event.imageUrl}
                alt={event.title}
                className="absolute inset-0 w-full h-full object-cover"
                data-testid={`img-hero-${index}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
                <div className="max-w-7xl mx-auto">
                  <Badge variant="secondary" className="mb-4 bg-white/20 text-white border-white/30 backdrop-blur-sm">
                    {event.category}
                  </Badge>
                  <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight" data-testid={`text-hero-title-${index}`}>
                    {event.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 text-white/90 mb-6">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(event.startDate), "yyyy.MM.dd", { locale: ko })} ~{" "}
                      {format(new Date(event.endDate), "MM.dd", { locale: ko })}
                    </span>
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button className="bg-white/20 backdrop-blur-sm border border-white/30 text-white" data-testid={`button-hero-details-${index}`}>
                      자세히 보기
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-white border border-white/30 backdrop-blur-sm" data-testid={`button-hero-share-${index}`}>
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {heroEvents.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {heroEvents.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => scrollTo(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                selectedIndex === index 
                  ? "bg-white w-8" 
                  : "bg-white/50 hover:bg-white/70"
              }`}
              data-testid={`button-hero-dot-${index}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CategoryFilter({
  selected,
  onSelect,
}: {
  selected: EventCategory | "전체";
  onSelect: (category: EventCategory | "전체") => void;
}) {
  const allCategories: (EventCategory | "전체")[] = ["전체", ...categories];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {allCategories.map((category) => (
        <Button
          key={category}
          variant={selected === category ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(category)}
          className="whitespace-nowrap flex-shrink-0"
          data-testid={`button-filter-${category}`}
        >
          {category}
        </Button>
      ))}
    </div>
  );
}

function EventCard({ event }: { event: CulturalEvent }) {
  const [isLiked, setIsLiked] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: event.description,
          url: window.location.origin,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Card 
        className="group overflow-hidden hover-elevate cursor-pointer" 
        data-testid={`card-event-${event.id}`}
        onClick={() => setIsOpen(true)}
      >
        <div className="relative aspect-video overflow-hidden">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <Badge
            variant="secondary"
            className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm"
          >
            {event.category}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className={`absolute top-3 right-3 bg-background/90 backdrop-blur-sm ${
              isLiked ? "text-red-500" : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setIsLiked(!isLiked);
            }}
            data-testid={`button-like-${event.id}`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
          </Button>
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2" data-testid={`text-event-title-${event.id}`}>
            {event.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {event.description}
          </p>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(event.startDate), "MM.dd", { locale: ko })} ~{" "}
              {format(new Date(event.endDate), "MM.dd", { locale: ko })}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              {event.location}
            </span>
          </div>
        </CardContent>
      </Card>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge>{event.category}</Badge>
            {event.isFeatured && <Badge variant="secondary">추천</Badge>}
          </div>
          <DialogTitle className="text-xl md:text-2xl leading-tight">
            {event.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {event.title} 행사 상세 정보
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="aspect-video rounded-lg overflow-hidden">
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-4">
            <div className="flex flex-col gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">일정</p>
                  <p className="font-medium">
                    {format(new Date(event.startDate), "yyyy년 M월 d일 (EEE)", { locale: ko })} ~{" "}
                    {format(new Date(event.endDate), "yyyy년 M월 d일 (EEE)", { locale: ko })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">장소</p>
                  <p className="font-medium">{event.location}</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">행사 소개</h4>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-4 border-t">
              <Button
                variant={isLiked ? "default" : "outline"}
                size="sm"
                onClick={() => setIsLiked(!isLiked)}
                className="gap-2"
              >
                <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                {isLiked ? "관심 등록됨" : "관심 등록"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
                <Share2 className="h-4 w-4" />
                공유하기
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EventCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video" />
      <CardContent className="p-4">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-2/3 mb-3" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );
}

function EventsGrid({ events, isLoading }: { events: CulturalEvent[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">등록된 행사가 없습니다</h3>
        <p className="text-muted-foreground">새로운 문화행사가 곧 등록될 예정입니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

function NewsCard({ news }: { news: NewsItem }) {
  return (
    <div
      className="flex gap-4 p-4 rounded-md hover-elevate active-elevate-2 cursor-pointer"
      data-testid={`card-news-${news.id}`}
    >
      <div className="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-muted">
        <img
          src={news.imageUrl}
          alt={news.title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs">
            {news.category}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {format(new Date(news.publishedAt), "yyyy.MM.dd", { locale: ko })}
          </span>
        </div>
        <h4 className="font-medium line-clamp-2 mb-1" data-testid={`text-news-title-${news.id}`}>
          {news.title}
        </h4>
        <p className="text-sm text-muted-foreground line-clamp-1">
          {news.summary}
        </p>
      </div>
    </div>
  );
}

function NewsCardSkeleton() {
  return (
    <div className="flex gap-4 p-4">
      <Skeleton className="w-20 h-20 flex-shrink-0 rounded-md" />
      <div className="flex-1">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-5 w-full mb-1" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

function NewsFeed({ news, isLoading }: { news: NewsItem[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <NewsCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">최신 소식이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {news.map((item) => (
        <NewsCard key={item.id} news={item} />
      ))}
    </div>
  );
}

function ImageUploadField({ form }: { form: any }) {
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
        <label className="text-sm font-medium flex items-center gap-2">
          <ImagePlus className="h-4 w-4" />
          이미지 (선택)
        </label>
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
        <div>
          <Input
            placeholder="https://example.com/image.jpg"
            value={imageValue || ""}
            onChange={(e) => form.setValue("imageUrl", e.target.value)}
            data-testid="input-image-url"
          />
          <p className="text-xs text-muted-foreground mt-1">
            권장 크기: 800x450px (16:9 비율)
          </p>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
              className="flex-1"
              data-testid="input-image-file"
            />
            {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            권장 크기: 800x450px (16:9 비율) / 최대 2MB
          </p>
          {uploadError && (
            <p className="text-xs text-destructive mt-1">{uploadError}</p>
          )}
        </div>
      )}

      {imageValue && (
        <div className="mt-2 rounded-md border overflow-hidden relative">
          <img
            src={imageValue.startsWith("/objects/") ? imageValue : imageValue}
            alt="미리보기"
            className="w-full h-32 object-cover"
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

function GuestPostForm({ 
  onSuccess, 
  initialType,
  triggerButton,
  externalOpen,
  onOpenChange,
}: { 
  onSuccess: () => void;
  initialType?: "event" | "news" | "general" | "inquiry";
  triggerButton?: React.ReactNode;
  externalOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const form = useForm({
    resolver: zodResolver(insertGuestPostSchema),
    defaultValues: {
      type: (initialType || "general") as "event" | "news" | "general" | "inquiry",
      title: "",
      content: "",
      category: "",
      authorName: "",
      authorContact: "",
      imageUrl: "",
    },
  });

  const watchType = form.watch("type") as "event" | "news" | "general" | "inquiry";

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/guest-posts", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "등록 완료",
        description: data.message || "게시글이 등록되었습니다. 관리자 승인 후 공개됩니다.",
      });
      form.reset();
      setOpen(false);
      onSuccess();
    },
    onError: () => {
      toast({
        title: "등록 실패",
        description: "게시글 등록에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    submitMutation.mutate(data);
  };

  const dialogTitle = initialType === "inquiry" ? "문의하기" : "정보 공유하기";
  const dialogDesc = initialType === "inquiry" 
    ? "문의 내용을 남겨주세요. 확인 후 답변 드리겠습니다."
    : "정읍 관련 행사, 소식 등을 자유롭게 공유해주세요. 관리자 승인 후 공개됩니다.";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerButton ? (
        <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button size="lg" className="gap-2" data-testid="button-submit-post">
            <PenLine className="h-5 w-5" />
            정보 공유하기
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription>
            {dialogDesc}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!initialType && (
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>유형</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-post-type">
                          <SelectValue placeholder="유형을 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="event">행사/축제</SelectItem>
                        <SelectItem value="news">소식</SelectItem>
                        <SelectItem value="general">일반</SelectItem>
                        <SelectItem value="inquiry">문의</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제목</FormLabel>
                  <FormControl>
                    <Input placeholder="제목을 입력하세요" {...field} data-testid="input-post-title" />
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
                      className="min-h-[100px]"
                      {...field} 
                      data-testid="input-post-content"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {watchType !== "inquiry" && initialType !== "inquiry" && (
              <ImageUploadField form={form} />
            )}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="authorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>작성자 이름</FormLabel>
                    <FormControl>
                      <Input placeholder="이름" {...field} data-testid="input-author-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="authorContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>연락처 {watchType === "inquiry" || initialType === "inquiry" ? "" : "(선택)"}</FormLabel>
                    <FormControl>
                      <Input placeholder="연락처" {...field} data-testid="input-author-contact" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full gap-2" 
              disabled={submitMutation.isPending}
              data-testid="button-submit-form"
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              등록하기
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function CommunityPosts({ posts, isLoading }: { posts: GuestPost[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquarePlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">아직 등록된 게시글이 없습니다.</p>
        <p className="text-sm text-muted-foreground mt-1">첫 번째로 정보를 공유해보세요!</p>
      </div>
    );
  }

  const typeLabels: Record<string, string> = {
    event: "행사",
    news: "소식",
    product: "상품",
    general: "일반",
  };

  return (
    <div className="space-y-3">
      {posts.slice(0, 5).map((post) => (
        <Card key={post.id} className="hover-elevate" data-testid={`card-community-post-${post.id}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {typeLabels[post.type] || post.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {post.authorName}
                  </span>
                </div>
                <h4 className="font-medium line-clamp-1" data-testid={`text-post-title-${post.id}`}>
                  {post.title}
                </h4>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {post.content}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function QuickLinks({ onInquiryClick }: { onInquiryClick: () => void }) {
  return (
    <section className="py-12 bg-muted/50">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-xl font-bold mb-6">바로가기</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickLinks.map((link) => {
            if (link.action === "inquiry") {
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={onInquiryClick}
                  className="flex flex-col items-center gap-3 p-6 rounded-md bg-background border hover-elevate active-elevate-2 transition-all"
                  data-testid={`link-quick-${link.id}`}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <link.icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="font-medium text-sm">{link.title}</span>
                </button>
              );
            }
            return (
              <a
                key={link.id}
                href={link.url}
                className="flex flex-col items-center gap-3 p-6 rounded-md bg-background border hover-elevate active-elevate-2 transition-all"
                data-testid={`link-quick-${link.id}`}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <link.icon className="h-6 w-6 text-primary" />
                </div>
                <span className="font-medium text-sm">{link.title}</span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PastEventItem({ event }: { event: CulturalEvent }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <div
        className="flex items-center justify-between gap-4 p-3 rounded-md bg-background border hover-elevate cursor-pointer"
        data-testid={`past-event-${event.id}`}
        onClick={() => setIsOpen(true)}
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate" data-testid={`text-past-event-title-${event.id}`}>
            {event.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {event.category}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {event.location}
            </span>
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
          <p>{format(new Date(event.startDate), "yyyy.MM.dd", { locale: ko })}</p>
          <p>~ {format(new Date(event.endDate), "MM.dd", { locale: ko })}</p>
        </div>
      </div>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge>{event.category}</Badge>
            <Badge variant="outline">지난 행사</Badge>
          </div>
          <DialogTitle className="text-xl md:text-2xl leading-tight">
            {event.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {event.title} 지난 행사 상세 정보
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {event.imageUrl && (
            <div className="aspect-video rounded-lg overflow-hidden">
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="space-y-4">
            <div className="flex flex-col gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">일정 (종료됨)</p>
                  <p className="font-medium">
                    {format(new Date(event.startDate), "yyyy년 M월 d일", { locale: ko })} ~{" "}
                    {format(new Date(event.endDate), "yyyy년 M월 d일", { locale: ko })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">장소</p>
                  <p className="font-medium">{event.location}</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">행사 소개</h4>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PastEventsList({ events, isLoading }: { events: CulturalEvent[]; isLoading: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const displayEvents = showAll ? events : events.slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">지난 행사 기록이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayEvents.map((event) => (
        <PastEventItem key={event.id} event={event} />
      ))}
      {events.length > 5 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setShowAll(!showAll)}
          data-testid="button-toggle-past-events"
        >
          {showAll ? "접기" : `더보기 (${events.length - 5}개)`}
          <ChevronRight className={`ml-1 h-4 w-4 transition-transform ${showAll ? "rotate-90" : ""}`} />
        </Button>
      )}
    </div>
  );
}

function Footer() {
  const { data: visitorData } = useQuery<{ count: number }>({
    queryKey: ["/api/visitors"],
  });

  return (
    <footer className="bg-card border-t py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">정읍</span>
              </div>
              <div>
                <h3 className="font-bold">정읍에서뭐하지</h3>
                <p className="text-xs text-muted-foreground">친절한 세웅씨 운영</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              정읍시의 다양한 문화행사, 축제, 소식을 함께 나누는 커뮤니티입니다. 
              누구나 자유롭게 정보를 공유할 수 있어요!
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span data-testid="text-visitor-count">
                총 방문자: {visitorData?.count?.toLocaleString() || "..."}명
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">운영자 정보</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>운영: 친절한 세웅씨</li>
              <li>지역: 전북특별자치도 정읍시</li>
              <li>문의: 카카오톡 또는 댓글</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">안내</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>이 사이트는 개인이 운영합니다</li>
              <li>정읍시 공식 사이트가 아닙니다</li>
              <li>정보 공유는 누구나 환영합니다</li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 친절한 세웅씨. 정읍에서뭐하지
          </p>
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm" data-testid="button-admin">
                <Settings className="mr-1 h-4 w-4" />
                관리
              </Button>
            </Link>
            <Button variant="ghost" size="sm" data-testid="button-lang-ko">
              한국어
            </Button>
            <Button variant="ghost" size="sm" data-testid="button-lang-en">
              English
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | "전체">("전체");
  const [inquiryOpen, setInquiryOpen] = useState(false);

  useEffect(() => {
    const hasVisited = sessionStorage.getItem("visited");
    if (!hasVisited) {
      apiRequest("POST", "/api/visitors/increment").catch(console.error);
      sessionStorage.setItem("visited", "true");
    }
  }, []);

  const { data: upcomingEvents = [], isLoading: eventsLoading } = useQuery<CulturalEvent[]>({
    queryKey: ["/api/events", "upcoming"],
    queryFn: async () => {
      const res = await fetch("/api/events?status=upcoming");
      return res.json();
    },
  });

  const { data: pastEvents = [], isLoading: pastEventsLoading } = useQuery<CulturalEvent[]>({
    queryKey: ["/api/events", "past"],
    queryFn: async () => {
      const res = await fetch("/api/events?status=past");
      return res.json();
    },
  });

  const { data: news = [], isLoading: newsLoading } = useQuery<NewsItem[]>({
    queryKey: ["/api/news"],
  });

  const { data: communityPosts = [], isLoading: postsLoading } = useQuery<GuestPost[]>({
    queryKey: ["/api/guest-posts/approved"],
  });

  const heroEvents = upcomingEvents.filter((e) => e.isFeatured || upcomingEvents.indexOf(e) < 5);
  const filteredEvents =
    selectedCategory === "전체"
      ? upcomingEvents
      : upcomingEvents.filter((e) => e.category === selectedCategory);

  const handlePostSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/guest-posts/approved"] });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuToggle={() => setIsMenuOpen(!isMenuOpen)} isMenuOpen={isMenuOpen} />
      <MobileMenu isOpen={isMenuOpen} />

      <main>
        <HeroSection events={heroEvents} />

        <section className="py-8 bg-primary/5">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4 px-6 rounded-md bg-background border">
              <div>
                <h3 className="font-bold text-lg">정읍 소식을 함께 나눠요!</h3>
                <p className="text-sm text-muted-foreground">
                  행사, 맛집, 소식 등 정읍 관련 정보를 자유롭게 공유해주세요.
                </p>
              </div>
              <GuestPostForm onSuccess={handlePostSuccess} />
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <h2 className="text-2xl font-bold">다가오는 행사</h2>
              <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
            </div>
            <EventsGrid events={filteredEvents} isLoading={eventsLoading} />
          </div>
        </section>

        <section className="py-12 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-2 mb-6">
              <History className="h-6 w-6 text-muted-foreground" />
              <h2 className="text-2xl font-bold">지난 행사 기록</h2>
              <Badge variant="secondary" className="ml-2">
                {pastEvents.length}건
              </Badge>
            </div>
            <Card>
              <CardContent className="p-4">
                <PastEventsList events={pastEvents} isLoading={pastEventsLoading} />
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">기타소식</h2>
                  <Button variant="ghost" size="sm" data-testid="button-news-more">
                    더보기
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
                <Card>
                  <CardContent className="p-2">
                    <NewsFeed news={news} isLoading={newsLoading} />
                  </CardContent>
                </Card>
              </div>

              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <MessageSquarePlus className="h-6 w-6" />
                    커뮤니티
                  </h2>
                  <Button variant="ghost" size="sm" data-testid="button-community-more">
                    더보기
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
                <CommunityPosts posts={communityPosts} isLoading={postsLoading} />
              </div>

            </div>
          </div>
        </section>

        <QuickLinks onInquiryClick={() => setInquiryOpen(true)} />
      </main>

      <Footer />

      <GuestPostForm 
        onSuccess={handlePostSuccess} 
        initialType="inquiry"
        externalOpen={inquiryOpen}
        onOpenChange={setInquiryOpen}
        triggerButton={<span className="hidden" />}
      />

    </div>
  );
}
