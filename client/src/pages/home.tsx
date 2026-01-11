import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import type { CulturalEvent, NewsItem, EventCategory, Product, GuestPost } from "@shared/schema";
import { insertGuestPostSchema } from "@shared/schema";
import { ShoppingBag, Store } from "lucide-react";

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

function HeroSection({ featuredEvent }: { featuredEvent?: CulturalEvent }) {
  if (!featuredEvent) {
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
      <img
        src={featuredEvent.imageUrl}
        alt={featuredEvent.title}
        className="absolute inset-0 w-full h-full object-cover"
        data-testid="img-hero"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
        <div className="max-w-7xl mx-auto">
          <Badge variant="secondary" className="mb-4 bg-white/20 text-white border-white/30 backdrop-blur-sm">
            {featuredEvent.category}
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight" data-testid="text-hero-title">
            {featuredEvent.title}
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-white/90 mb-6">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {format(new Date(featuredEvent.startDate), "yyyy.MM.dd", { locale: ko })} ~{" "}
              {format(new Date(featuredEvent.endDate), "MM.dd", { locale: ko })}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {featuredEvent.location}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button className="bg-white/20 backdrop-blur-sm border border-white/30 text-white" data-testid="button-hero-details">
              자세히 보기
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white border border-white/30 backdrop-blur-sm" data-testid="button-hero-share">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
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

  return (
    <Card className="group overflow-hidden hover-elevate" data-testid={`card-event-${event.id}`}>
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
          onClick={() => setIsLiked(!isLiked)}
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

function ProductCard({ product }: { product: Product }) {
  const formattedPrice = new Intl.NumberFormat("ko-KR").format(product.price);
  const formattedOriginalPrice = product.originalPrice
    ? new Intl.NumberFormat("ko-KR").format(product.originalPrice)
    : null;
  const discountPercent = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;

  return (
    <Card className="overflow-hidden hover-elevate active-elevate-2" data-testid={`card-product-${product.id}`}>
      <div className="aspect-square relative">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
        />
        {discountPercent && (
          <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground">
            {discountPercent}% 할인
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{product.seller}</p>
        <h4 className="font-medium line-clamp-2 mb-2" data-testid={`text-product-name-${product.id}`}>
          {product.name}
        </h4>
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg" data-testid={`text-product-price-${product.id}`}>
            {formattedPrice}원
          </span>
          {formattedOriginalPrice && (
            <span className="text-sm text-muted-foreground line-through">
              {formattedOriginalPrice}원
            </span>
          )}
        </div>
        <Button className="w-full mt-3" size="sm" data-testid={`button-buy-${product.id}`}>
          <ShoppingBag className="mr-1 h-4 w-4" />
          구매하기
        </Button>
      </CardContent>
    </Card>
  );
}

function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-square" />
      <CardContent className="p-4">
        <Skeleton className="h-3 w-16 mb-1" />
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-6 w-24 mb-3" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

function ProductShop({ products, isLoading }: { products: Product[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8">
        <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">등록된 상품이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.slice(0, 4).map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
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
  initialType?: "event" | "news" | "product" | "general" | "inquiry";
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
      type: (initialType || "general") as "event" | "news" | "product" | "general" | "inquiry",
      title: "",
      content: "",
      category: "",
      authorName: "",
      authorContact: "",
      imageUrl: "",
      price: undefined as number | undefined,
      originalPrice: undefined as number | undefined,
      seller: "",
    },
  });

  const watchType = form.watch("type");

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

  const dialogTitle = initialType === "inquiry" ? "문의하기" : 
                       initialType === "product" ? "상품 등록" : "정보 공유하기";
  const dialogDesc = initialType === "inquiry" 
    ? "문의 내용을 남겨주세요. 확인 후 답변 드리겠습니다."
    : initialType === "product"
    ? "정읍 지역 상품을 등록해주세요. 관리자 승인 후 상품관에 공개됩니다."
    : "정읍 관련 행사, 소식, 상품 등을 자유롭게 공유해주세요. 관리자 승인 후 공개됩니다.";

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
                        <SelectItem value="product">상품</SelectItem>
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
            {(watchType === "product" || initialType === "product") && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>판매가격 (원)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="10000" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            value={field.value || ""}
                            data-testid="input-product-price" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="originalPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>원래가격 (선택)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="15000" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            value={field.value || ""}
                            data-testid="input-product-original-price" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="seller"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>판매자/농장명</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 정읍농장" {...field} data-testid="input-product-seller" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
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

function Footer() {
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
  const [productOpen, setProductOpen] = useState(false);

  const { data: events = [], isLoading: eventsLoading } = useQuery<CulturalEvent[]>({
    queryKey: ["/api/events"],
  });

  const { data: news = [], isLoading: newsLoading } = useQuery<NewsItem[]>({
    queryKey: ["/api/news"],
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: communityPosts = [], isLoading: postsLoading } = useQuery<GuestPost[]>({
    queryKey: ["/api/guest-posts/approved"],
  });

  const featuredEvent = events.find((e) => e.isFeatured);
  const filteredEvents =
    selectedCategory === "전체"
      ? events.filter((e) => !e.isFeatured)
      : events.filter((e) => e.category === selectedCategory && !e.isFeatured);

  const handlePostSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/guest-posts/approved"] });
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuToggle={() => setIsMenuOpen(!isMenuOpen)} isMenuOpen={isMenuOpen} />
      <MobileMenu isOpen={isMenuOpen} />

      <main>
        <HeroSection featuredEvent={featuredEvent} />

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
              <h2 className="text-2xl font-bold">문화행사</h2>
              <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
            </div>
            <EventsGrid events={filteredEvents} isLoading={eventsLoading} />
          </div>
        </section>

        <section className="py-12 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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

              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Store className="h-6 w-6" />
                    정읍상품관
                  </h2>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setProductOpen(true)}
                      data-testid="button-register-product"
                    >
                      <PenLine className="mr-1 h-4 w-4" />
                      상품등록
                    </Button>
                    <Button variant="ghost" size="sm" data-testid="button-products-more">
                      더보기
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <ProductShop products={products} isLoading={productsLoading} />
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

      <GuestPostForm 
        onSuccess={handlePostSuccess} 
        initialType="product"
        externalOpen={productOpen}
        onOpenChange={setProductOpen}
        triggerButton={<span className="hidden" />}
      />
    </div>
  );
}
