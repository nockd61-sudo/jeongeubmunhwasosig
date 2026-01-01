import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import type { CulturalEvent, NewsItem, EventCategory, Product } from "@shared/schema";
import { ShoppingBag, Store } from "lucide-react";

const categories: EventCategory[] = ["문화행사", "축제", "전시", "공연", "시정소식"];

const quickLinks = [
  { id: "1", title: "문화시설", icon: Building2, url: "#" },
  { id: "2", title: "온라인예약", icon: CalendarCheck, url: "#" },
  { id: "3", title: "관광정보", icon: Info, url: "#" },
  { id: "4", title: "문의하기", icon: Phone, url: "#" },
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
                <h1 className="font-bold text-lg leading-tight" data-testid="text-site-title">정읍시 문화정보</h1>
                <p className="text-xs text-muted-foreground">전북특별자치도</p>
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

function QuickLinks() {
  return (
    <section className="py-12 bg-muted/50">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-xl font-bold mb-6">바로가기</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
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
          ))}
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
                <h3 className="font-bold">정읍시 문화정보</h3>
                <p className="text-xs text-muted-foreground">전북특별자치도</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              전북특별자치도 정읍시의 다양한 문화행사와 시정소식을 한눈에 확인하세요.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">연락처</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>주소: 전북특별자치도 정읍시 충정로 234</li>
              <li>대표전화: 063-539-5114</li>
              <li>이메일: culture@jeongeup.go.kr</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">운영시간</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>평일: 09:00 - 18:00</li>
              <li>점심시간: 12:00 - 13:00</li>
              <li>주말 및 공휴일: 휴무</li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 정읍시. All rights reserved.
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

  const { data: events = [], isLoading: eventsLoading } = useQuery<CulturalEvent[]>({
    queryKey: ["/api/events"],
  });

  const { data: news = [], isLoading: newsLoading } = useQuery<NewsItem[]>({
    queryKey: ["/api/news"],
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const featuredEvent = events.find((e) => e.isFeatured);
  const filteredEvents =
    selectedCategory === "전체"
      ? events.filter((e) => !e.isFeatured)
      : events.filter((e) => e.category === selectedCategory && !e.isFeatured);

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuToggle={() => setIsMenuOpen(!isMenuOpen)} isMenuOpen={isMenuOpen} />
      <MobileMenu isOpen={isMenuOpen} />

      <main>
        <HeroSection featuredEvent={featuredEvent} />

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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">시정소식</h2>
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
                    <Store className="h-6 w-6" />
                    정읍상품관
                  </h2>
                  <Button variant="ghost" size="sm" data-testid="button-products-more">
                    더보기
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
                <ProductShop products={products} isLoading={productsLoading} />
              </div>
            </div>
          </div>
        </section>

        <QuickLinks />
      </main>

      <Footer />
    </div>
  );
}
