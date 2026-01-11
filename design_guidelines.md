# Design Guidelines: 정읍에서뭐하지 (What to do in Jeongeup)

## About This Platform
**Personal Community Platform** operated by "친절한 세웅씨" (Kind Sewoong). This is NOT an official government website - it's a community-driven platform for residents and visitors of Jeongeup City to discover local events and share information.

## Design Approach
**System-Based Approach** using Material Design principles for content-rich community applications with strong visual feedback and accessibility. The design prioritizes information clarity, easy navigation, warm community atmosphere, and efficient access to cultural events and local news.

## Core Design Elements

### Typography
- **Korean Primary**: Noto Sans KR (Google Fonts)
- **English/Numbers**: Inter (Google Fonts)
- **Hierarchy**: 
  - Headlines: text-3xl/4xl, font-bold
  - Section titles: text-xl/2xl, font-semibold
  - Body: text-base, font-normal
  - Metadata: text-sm, font-medium

### Layout System
**Tailwind spacing units**: 2, 4, 6, 8, 12, 16, 20
- Container: max-w-7xl mx-auto px-4
- Section padding: py-12 md:py-20
- Card spacing: p-6
- Grid gaps: gap-6 md:gap-8

### Component Library

**Header (Sticky)**
- City logo/wordmark (left)
- Search bar (center, expandable on mobile)
- Notification bell icon
- Menu toggle (mobile)
- Desktop: Category navigation tabs (문화행사, 축제, 전시, 공연, 시정소식)

**Hero Section (Dynamic Featured)**
- Full-width banner showcasing current major event/announcement
- Overlay with gradient for text readability
- Large hero image (1920x600px min)
- Title, date, category badge
- Primary CTA button with blur background

**Event Calendar Widget**
- Month view calendar with event dots
- Quick date picker
- Today highlight
- Clicking date filters events below

**Content Cards (Grid Layout)**
- 3-column desktop (lg:grid-cols-3)
- 2-column tablet (md:grid-cols-2)
- Single column mobile
- Card structure: Image (16:9), category badge, title, date/location, brief description
- Hover: subtle elevation increase

**Category Filter Bar**
- Horizontal scrollable chips (mobile)
- Fixed row (desktop)
- Active state indication
- "전체" (All) option

**News/Updates Feed**
- List-style layout for city announcements
- Thumbnail (left), content (right) on desktop
- Stacked on mobile
- Timestamp, category tag, headline

**Quick Links Section**
- 4-column grid of service shortcuts
- Icon + label format
- Links to: 문화시설, 온라인예약, 관광정보, 문의하기

**Footer**
- City contact information
- Operating hours
- Social media links
- Quick navigation
- Language toggle (한국어/English)

### Images
**Hero Image**: Large, high-quality photograph of current featured event/festival (landmark, cultural performance, or seasonal celebration). Full-width, 600-800px height.

**Event Cards**: 16:9 ratio images for each event (venues, performances, exhibitions). 400x225px minimum.

**News Thumbnails**: Square format (1:1) for city update articles. 120x120px.

**Quick Links Icons**: Use Material Icons via CDN for consistency.

### Interactions
- Smooth scrolling to filtered sections
- Card hover states (subtle shadow)
- Calendar date selection
- Search autocomplete dropdown
- Category filter transitions
- Pull-to-refresh on mobile
- Infinite scroll for event listings

### Special Features
- **Date-based filtering**: Events grouped by 오늘, 이번주, 이번달, 예정
- **Map integration**: Embedded map showing event locations
- **Share functionality**: Native share for events
- **Bookmark/Save**: Heart icon to save favorite events
- **Multi-language support**: KR/EN toggle

### Mobile Optimization
- Bottom navigation bar (홈, 일정, 알림, 더보기)
- Collapsible filters
- Touch-friendly tap targets (min 44x44px)
- Swipeable cards for events
- Progressive image loading