# Audico Chat Quote System

Beautiful AI-powered chat interface for generating audio/video equipment quotes with Claude AI and real-time product recommendations.

## 🎨 Features

### 3-Column Layout
- **Left Sidebar**: 8 specialized chat types (Home, Business, Restaurant, Gym, Worship, Education, Club, Tender)
- **Center**: Claude AI chat interface with context-aware responses
- **Right**: Live quote builder with product cards, quantities, and pricing

### AI Integration
- ✅ GPT-4o with function calling (tool-based search)
- ✅ 8 custom AI personas tailored to each industry
- ✅ Real-time product search from 23,000+ products
- ✅ Hybrid semantic + keyword search with embeddings
- ✅ Context-aware recommendations
- ✅ Conversation history maintained

### Quote Builder
- ✅ Product cards with images
- ✅ Quantity controls (+/-)
- ✅ Real-time pricing (Subtotal + 15% VAT)
- ✅ Remove products
- ✅ Clean, non-crowded single-line design

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

# AI APIs
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000/chat](http://localhost:3000/chat)

## 📁 Project Structure

```
audico-chat-quote/
├── app/
│   ├── chat/
│   │   └── page.tsx              # Main 3-column chat page
│   └── api/
│       └── chat-quote/
│           └── route.ts          # Claude AI + Supabase API
├── components/
│   └── chat/
│       ├── ChatSidebar.tsx       # Left sidebar with 8 chat types
│       ├── ChatInterface.tsx     # Center chat with Claude AI
│       └── QuoteBox.tsx          # Right quote builder
├── .env.local                    # Environment variables (gitignored)
├── .env.example                  # Example env vars
└── package.json
```

## 🔐 Security

✅ **What's Safe:**
- Environment variables only available server-side
- `NEXT_PUBLIC_*` variables exposed to client (only URL, not keys)
- API routes run on Vercel Edge (secure)

❌ **What to Avoid:**
- Never commit `.env.local` to Git (already gitignored)
- Never hardcode API keys in components
- Never expose `SUPABASE_SERVICE_KEY` to client

## 🎯 How It Works

1. **User selects chat type** → loads specialized AI persona
2. **User types message** → sent to `/api/chat-quote`
3. **API searches Supabase** for relevant products (by keywords)
4. **Claude AI responds** with personalized advice + product recommendations
5. **Products auto-add to quote** → user adjusts quantities
6. **Generate quote** → PDF export (coming soon)

## 🔄 Data Flow

```
User Message
    ↓
ChatInterface.tsx
    ↓
/api/chat-quote
    ├─> Supabase: Search products (by keywords)
    └─> Claude AI: Generate response with products
         ↓
    Extract mentioned products
         ↓
Return: { response, products }
    ↓
ChatInterface: Display message + add products to quote
    ↓
QuoteBox: Show products with pricing
```

## 🚢 Deployment to Vercel

### Via GitHub (Recommended)

1. Push to GitHub:
```bash
git init
git add .
git commit -m "Initial commit - Audico Chat Quote System"
git branch -M main
git remote add origin your-repo-url
git push -u origin main
```

2. Connect to Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables in Vercel dashboard
   - Deploy

### Environment Variables in Vercel

Add these in **Settings** → **Environment Variables**:

```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
SUPABASE_SERVICE_KEY = [your_service_key]
ANTHROPIC_API_KEY = [your_anthropic_key]
OPENAI_API_KEY = [your_openai_key]
NEXT_PUBLIC_OPENAI_API_KEY = [your_openai_key]
```

## 🎨 Customization

### Add New Chat Type

1. Add to `ChatType` in `app/chat/page.tsx`:
```typescript
export type ChatType = 'home' | 'business' | 'restaurant' | 'gym' | 'worship' | 'education' | 'club' | 'tender' | 'your-new-type';
```

2. Add icon in `components/chat/ChatSidebar.tsx`:
```typescript
{ id: 'your-new-type', label: 'Your Label', icon: <YourIcon className="w-5 h-5" /> }
```

3. Add system prompt in `app/api/chat-quote/route.ts`:
```typescript
'your-new-type': `You are a [Your Type] Expert at Audico...`
```

### Change Colors

Edit gradient colors in components using Tailwind classes:
- Purple-blue gradient: `from-purple-500 to-blue-600`
- Background: `from-purple-50 via-blue-50 to-purple-100`

## 🐛 Troubleshooting

### "ANTHROPIC_API_KEY is not defined"
- Check `.env.local` exists and has correct key
- Restart dev server: `npm run dev`

### "Failed to fetch products"
- Verify `SUPABASE_SERVICE_KEY` in `.env.local`
- Check Supabase `products` table exists

### Chat not loading
- Check browser console for errors
- Verify `/api/chat-quote/route.ts` exists
- Check API route logs in terminal

## 📝 Next Steps

- [ ] Test all 8 chat types
- [ ] Add PDF export functionality
- [ ] Add email/share quote feature
- [ ] Connect to OpenCart for order placement
- [ ] Add user authentication
- [ ] Add quote history

## 📚 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: Anthropic Claude 3.5 Sonnet
- **Database**: Supabase (PostgreSQL)
- **Icons**: Lucide React
- **Deployment**: Vercel Edge

## 📄 License

Private - Audico Internal Use Only
