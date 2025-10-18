# Product Tier Matching Logic

## Overview
The AI uses intelligent tier matching to ensure components in a system are appropriately matched by quality and price point. When a customer selects a core component (amplifier/receiver), the AI learns their budget tier and suggests compatible components.

## How It Works

### 1. Context Gathering Phase
**FIRST**: AI asks questions without suggesting products
- Room size and layout
- Primary usage
- Budget range
- Existing equipment
- Specific preferences

### 2. Audio Configuration Questions (HOME CINEMA)
**BEFORE suggesting receivers**: AI asks about audio setup
- 5.1, 7.1, or Dolby Atmos?
- Speaker placement preferences (floor-standing, in-ceiling, etc.)
- **ONLY AFTER these answers** → suggest receivers

### 3. Core Component Selection
**THEN**: AI suggests amplifiers/receivers based on context
- **ALWAYS prioritize mainstream brands FIRST**: Denon, Marantz, Yamaha
- **ONLY suggest specialty brands** (Anthem, Rotel) when customer indicates high/unlimited budget

Customer selects or shows interest → AI notes the price tier

### 4. Intelligent Matching
**FINALLY**: AI suggests speakers and components matching that tier

---

## Price Tiers (South African Rand)

### Budget Tier: R5,000 - R30,000 Amplifier

**Amplifier Examples:**
- Denon AVR-X580BT (~R8,000-R12,000)
- Yamaha RX-V4A (~R10,000-R15,000)
- Denon AVR-S670H (~R12,000-R18,000)
- Marantz NR1200 (~R18,000-R25,000)

**Matched Speaker Brands:**
- **Polk Audio** (entry-level)
- **Klipsch Reference** (R-series)
- **Denon** (budget speakers)
- **Yamaha NS** (entry-level)

**Target Speaker Price:** R3,000 - R12,000 per pair

---

### Mid Tier: R30,000 - R80,000 Amplifier

**Amplifier Examples:**
- Denon AVR-X2800H (~R30,000-R40,000)
- Marantz CINEMA 70s (~R40,000-R50,000)
- Denon AVR-X3800H (~R45,000-R60,000)
- Marantz CINEMA 60 (~R55,000-R70,000)

**Matched Speaker Brands:**
- **Klipsch Reference Premiere** (RP-series)
- **Polk Audio Signature/Reserve**
- **JBL Stage/Studio**
- **KEF Q Series**
- **Monitor Audio Bronze/Silver**

**Target Speaker Price:** R12,000 - R35,000 per pair

---

### High Tier: R80,000 - R150,000 Amplifier

**Amplifier Examples:**
- Denon AVC-X4800H (~R80,000-R100,000)
- Marantz AV10 (~R100,000-R130,000)
- Anthem MRX 740/1140 (~R95,000-R130,000)

**Matched Speaker Brands:**
- **Monitor Audio Gold**
- **KEF R Series**
- **Bowers & Wilkins 600/700 Series**
- **Focal Aria/Chora**
- **Paradigm Premier**

**Target Speaker Price:** R35,000 - R80,000 per pair

---

### Ultra Tier: R150,000+ Amplifier

**Amplifier Examples:**
- Denon AVC-A1H (~R180,000+)
- Marantz AV10 + AMP10 (~R250,000+)
- Anthem AVM 70/90 (~R120,000-R200,000)
- Anthem Statement Series (~R200,000-R300,000+)

**Matched Speaker Brands:**
- **Paradigm Founder/Persona**
- **Bowers & Wilkins 800 Series**
- **Monitor Audio Platinum**
- **KEF Reference/Blade**
- **Focal Sopra/Utopia**

**Target Speaker Price:** R80,000 - R300,000+ per pair

---

## AI Decision Making

The AI uses the **AVAILABLE PRODUCTS** list to:

1. **Identify price tiers automatically** based on actual product prices in stock
2. **Match components intelligently** without hardcoded rules
3. **Adapt to inventory changes** - if premium brands are out of stock, suggest best available alternatives
4. **Consider total system budget** - if customer has R200k total budget and picks R60k amplifier, suggest speakers in R40-80k range

---

## Example Conversation Flow

### Budget Tier Example

```
Customer: "Need a cinema system"
AI: "Great! Let me ask a few questions:
     1. Room size?
     2. Budget?
     3. Primary use?"

Customer: "5x4m, R50k budget, movies"
AI: "Perfect! For R50k, I'd suggest starting with a receiver.

     The Denon AVR-X2800H at R32,990 would be excellent -
     leaves budget for quality speakers."

Customer: "Okay, let's go with the Denon"
AI: "Great choice! For speakers to match, I'd recommend:

     - Polk Audio Reserve R600 (R18,000/pair) - excellent value
     - Klipsch Reference RP-8000F (R22,000/pair) - dynamic sound

     Which appeals to you?"
```

### High Tier Example

```
Customer: "Building reference cinema, R500k budget"
AI: "Excellent! Questions:
     1. Room dimensions?
     2. Sound character preference?
     3. Existing equipment?"

Customer: "7x6m, neutral/accurate, nothing existing"
AI: "For a reference system at R500k, I'd start with:

     Anthem AVM 90 at R202,190 - flagship processor with
     room correction and precision."

Customer: "Perfect, what speakers?"
AI: "To match the Anthem AVM 90's caliber:

     - Paradigm Founder 100F (R142,490/pair) - Canadian precision
     - Monitor Audio Platinum 200 (R160k/pair if in stock)

     Both are flagship-grade to match your processor."
```

---

## Business/Commercial Tier Logic

For business/education/tender tabs, tier matching works differently:

### Small Business/Education: R20k-R50k
- **Core**: Yealink MVC300/500, Logitech Rally Bar Mini
- **Match**: Basic displays, entry projectors

### Mid Business: R50k-R150k
- **Core**: Yealink MVC900, Logitech Rally, Poly Studio X50
- **Match**: Professional displays, mid-tier projectors (Epson EB-series)

### Enterprise: R150k+
- **Core**: Yealink MVC1000, Poly Studio X70, Neat Bar Pro
- **Match**: Premium displays, high-end projectors (Epson EB-L series, Barco)

---

## Key Principles

1. **Context before products** - Never suggest without understanding needs
2. **Audio config before receivers** - Ask about 5.1/7.1/Atmos BEFORE suggesting receivers
3. **Mainstream brands first** - Always suggest Denon/Marantz/Yamaha first
4. **Specialty brands last** - Only mention Anthem/Rotel/Classe for high-end customers
5. **Core component first** - Amplifier/receiver defines the tier
6. **Match the tier** - Speakers should complement the amplifier's quality level
7. **Stay in budget** - Consider total system cost, not just individual components
8. **Be honest** - If tier-appropriate products aren't in stock, explain and offer alternatives
9. **Build progressively** - One component type at a time

## High-End Upgrade Path

When suggesting mainstream options, the AI should naturally offer an upgrade path:

**Example**:
> "For your mid-tier budget, I'd recommend:
> - Denon AVR-X2800H at R32,990 (excellent value)
> - Marantz CINEMA 70s at R45,000 (premium option)
>
> *If you're looking for reference-grade performance, we also have high-end Anthem processors available.*"

This allows customers to:
- See mainstream options first (what most people buy)
- Be aware of premium options without pressure
- Self-select if they want to explore high-end

---

## Fallback Strategy

If tier-appropriate products aren't available:

1. **Acknowledge**: "For the [amplifier], I'd normally recommend [brand/tier]"
2. **Explain**: "Currently, our closest match in stock is [available product]"
3. **Alternative**: "This is slightly [above/below] the tier, but still a great match because..."
4. **Future**: "I can notify you when [preferred brand] arrives"

---

## Notes

- AI can deviate from tiers if customer explicitly requests different approach
- Budget constraints always override tier matching
- Some customers may want "budget speakers now, upgrade later" - respect that
- Commercial/pro audio follows different tier logic (SPL/coverage vs. audiophile quality)
