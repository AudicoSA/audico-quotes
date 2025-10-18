/**
 * System Requirements Templates and Logic
 * Defines what components are needed for complete AV systems
 */

export type RequirementStatus = 'complete' | 'partial' | 'missing' | 'critical';

export interface SystemRequirement {
  id: string;
  name: string;
  description: string;
  status: RequirementStatus;
  quantity_needed?: number;
  quantity_have?: number;
  covered_by?: string[]; // Product IDs that fulfill this requirement
  note?: string;
  category_keywords: string[]; // Used to match products to requirements
  optional?: boolean;
}

export interface SystemTemplate {
  id: string;
  name: string;
  description: string;
  use_case: string;
  budget_range?: string;
  requirements: SystemRequirement[];
}

// ============================================
// VIDEO CONFERENCE ROOM TEMPLATES
// ============================================

export const VIDEO_CONFERENCE_HUDDLE: SystemTemplate = {
  id: 'video_conference_huddle',
  name: 'Huddle Room (2-6 people)',
  description: 'Small video conference room with USB all-in-one solution',
  use_case: 'BYOD or simple Teams/Zoom calls',
  budget_range: 'R20,000 - R60,000',
  requirements: [
    {
      id: 'video_bar',
      name: 'USB Video Bar (All-in-One)',
      description: 'Camera + Microphones + Speakers integrated',
      status: 'missing',
      category_keywords: ['video bar', 'all-in-one', 'usb camera', 'conference camera', 'rally bar', 'smartvision'],
    },
    {
      id: 'display',
      name: '55-65" Commercial Display',
      description: '16/7 rated display for business use',
      status: 'missing',
      category_keywords: ['display', 'monitor', 'screen', 'signage', 'tv', 'panel'],
    },
    {
      id: 'cable_hub',
      name: 'HDMI/USB-C Table Hub',
      description: 'For laptop connectivity and content sharing',
      status: 'missing',
      optional: true,
      category_keywords: ['cable hub', 'table hub', 'connectivity', 'usb hub', 'hdmi hub'],
    },
    {
      id: 'mounting',
      name: 'Wall Mounts',
      description: 'Mounts for video bar and display',
      status: 'missing',
      optional: true,
      category_keywords: ['mount', 'bracket', 'wall mount', 'stand'],
    },
  ],
};

export const VIDEO_CONFERENCE_BOARDROOM: SystemTemplate = {
  id: 'video_conference_boardroom',
  name: 'Boardroom (6-14 people)',
  description: 'Professional boardroom with native Teams/Zoom Rooms',
  use_case: 'Native Teams Rooms or Zoom Rooms with touch-to-join',
  budget_range: 'R60,000 - R180,000',
  requirements: [
    {
      id: 'compute',
      name: 'Teams/Zoom Room Compute Unit',
      description: 'Certified PC/appliance to run meeting software',
      status: 'critical',
      category_keywords: ['mcore', 'compute', 'teams room', 'zoom room', 'room pc', 'controller'],
    },
    {
      id: 'touch_controller',
      name: 'Touch Controller',
      description: 'Touch panel for joining calls and control',
      status: 'critical',
      category_keywords: ['mtouch', 'touch controller', 'control panel', 'room controller'],
    },
    {
      id: 'ptz_camera',
      name: 'PTZ Camera',
      description: 'Pan-tilt-zoom camera with auto-tracking',
      status: 'missing',
      category_keywords: ['ptz', 'camera', 'mtower', 'auto tracking', 'video camera'],
    },
    {
      id: 'ceiling_mics',
      name: 'Ceiling Microphones',
      description: '2-4 microphones for table coverage',
      status: 'missing',
      quantity_needed: 2,
      category_keywords: ['ceiling mic', 'microphone', 'beamforming', 'conference mic'],
    },
    {
      id: 'ceiling_speakers',
      name: 'Ceiling Speakers',
      description: '2-4 speakers for even voice distribution',
      status: 'missing',
      quantity_needed: 4,
      category_keywords: ['ceiling speaker', 'in-ceiling', 'speaker'],
    },
    {
      id: 'dsp',
      name: 'Audio DSP',
      description: 'Echo cancellation, mixing, noise reduction',
      status: 'missing',
      category_keywords: ['dsp', 'audio processor', 'echo cancellation', 'mixer'],
    },
    {
      id: 'amplifier',
      name: 'Amplifier',
      description: 'Power amplifier for passive speakers',
      status: 'missing',
      note: 'Only needed if speakers are passive',
      category_keywords: ['amplifier', 'amp', 'power amp'],
    },
    {
      id: 'display',
      name: '75-86" Commercial Display',
      description: '24/7 rated display for boardroom',
      status: 'missing',
      category_keywords: ['display', 'monitor', 'screen', 'signage', '75', '86'],
    },
  ],
};

export const VIDEO_CONFERENCE_LARGE: SystemTemplate = {
  id: 'video_conference_large',
  name: 'Large Conference Room (12-20+ people)',
  description: 'Enterprise-grade conference room system',
  use_case: 'Large meetings, training rooms, executive boardrooms',
  budget_range: 'R180,000 - R600,000+',
  requirements: [
    {
      id: 'compute',
      name: 'Teams/Zoom Room System',
      description: 'Enterprise compute + controller',
      status: 'critical',
      category_keywords: ['mcore', 'compute', 'teams room', 'zoom room'],
    },
    {
      id: 'ptz_cameras',
      name: 'PTZ Cameras (2x)',
      description: 'Multiple cameras for full room coverage',
      status: 'missing',
      quantity_needed: 2,
      category_keywords: ['ptz', 'camera', 'mtower'],
    },
    {
      id: 'mic_array',
      name: 'Beamforming Microphone Array',
      description: '4-8 ceiling mics for large table',
      status: 'missing',
      quantity_needed: 4,
      category_keywords: ['ceiling mic', 'beamforming', 'microphone array'],
    },
    {
      id: 'ceiling_speakers',
      name: 'Ceiling Speakers (6-8x)',
      description: 'Professional audio distribution',
      status: 'missing',
      quantity_needed: 6,
      category_keywords: ['ceiling speaker', 'in-ceiling'],
    },
    {
      id: 'dsp',
      name: 'Professional DSP',
      description: 'Biamp/QSC/Shure professional processor',
      status: 'missing',
      category_keywords: ['dsp', 'biamp', 'qsc', 'shure', 'audio processor'],
    },
    {
      id: 'amplifier',
      name: 'Multi-Channel Amplifier',
      description: 'Power all speakers with headroom',
      status: 'missing',
      category_keywords: ['amplifier', 'multi channel', 'power amp'],
    },
    {
      id: 'displays',
      name: 'Large Displays (2x 86")',
      description: 'Dual displays or LED wall',
      status: 'missing',
      quantity_needed: 2,
      category_keywords: ['display', '86', 'led wall', 'video wall'],
    },
    {
      id: 'wireless_presentation',
      name: 'Wireless Presentation System',
      description: 'For content sharing',
      status: 'missing',
      optional: true,
      category_keywords: ['wireless', 'presentation', 'barco', 'clickshare'],
    },
  ],
};

// ============================================
// HOME CINEMA TEMPLATES
// ============================================

export const HOME_CINEMA_5_1_4: SystemTemplate = {
  id: 'home_cinema_5_1_4',
  name: '5.1.4 Dolby Atmos Home Cinema',
  description: 'Complete 5.1.4 channel home theater system',
  use_case: 'Immersive home cinema with Dolby Atmos',
  budget_range: 'R100,000 - R500,000',
  requirements: [
    {
      id: 'avr',
      name: 'AV Receiver (9+ channels)',
      description: '9-11 channel AVR for 5.1.4 Atmos',
      status: 'missing',
      category_keywords: ['av receiver', 'avr', 'receiver', 'denon', 'marantz', 'anthem'],
    },
    {
      id: 'front_speakers',
      name: 'Front Speakers (L/R)',
      description: 'Floorstanding or bookshelf for front stage',
      status: 'missing',
      quantity_needed: 2,
      category_keywords: ['floorstanding', 'tower', 'bookshelf', 'front speaker'],
    },
    {
      id: 'center',
      name: 'Center Channel Speaker',
      description: 'Critical for clear dialogue',
      status: 'missing',
      category_keywords: ['center', 'center channel', 'center speaker'],
    },
    {
      id: 'surrounds',
      name: 'Surround Speakers (2x)',
      description: 'Side/rear surround speakers',
      status: 'missing',
      quantity_needed: 2,
      category_keywords: ['surround', 'bipole', 'dipole', 'side speaker'],
    },
    {
      id: 'atmos',
      name: 'Atmos Speakers (4x)',
      description: 'In-ceiling or upfiring modules',
      status: 'missing',
      quantity_needed: 4,
      category_keywords: ['atmos', 'height', 'ceiling', 'upfiring', 'elevation'],
    },
    {
      id: 'subwoofer',
      name: 'Subwoofer',
      description: 'Powered subwoofer for bass',
      status: 'missing',
      category_keywords: ['subwoofer', 'sub', 'bass', 'woofer'],
    },
    {
      id: 'cables',
      name: 'Speaker Cable & HDMI Cables',
      description: 'Quality cables for connections',
      status: 'missing',
      optional: true,
      category_keywords: ['cable', 'speaker wire', 'hdmi', 'audioquest', 'qed'],
    },
  ],
};

export const MULTIROOM_AUDIO: SystemTemplate = {
  id: 'multiroom_audio',
  name: 'Whole-Home Multiroom Audio',
  description: 'Multi-zone synchronized audio system',
  use_case: 'Background music throughout home',
  budget_range: 'R80,000 - R300,000',
  requirements: [
    {
      id: 'main_avr',
      name: 'Main AV Receiver (TV Room)',
      description: 'AVR for main entertainment space',
      status: 'missing',
      category_keywords: ['av receiver', 'avr', 'denon', 'marantz'],
    },
    {
      id: 'zone_amps',
      name: 'Zone Amplifiers',
      description: 'Streaming amps for each zone (WiiM, Denon HEOS)',
      status: 'missing',
      quantity_needed: 3,
      category_keywords: ['wiim', 'heos', 'streaming amp', 'zone amp'],
    },
    {
      id: 'speakers_per_zone',
      name: 'Speakers Per Zone',
      description: 'In-ceiling, bookshelf, or outdoor per room',
      status: 'missing',
      quantity_needed: 6,
      category_keywords: ['ceiling speaker', 'bookshelf', 'outdoor speaker'],
    },
    {
      id: 'cables',
      name: 'Speaker Cable (Bulk)',
      description: '100m+ for whole-home installation',
      status: 'missing',
      optional: true,
      category_keywords: ['speaker cable', 'bulk cable', 'installation wire'],
    },
  ],
};

// ============================================
// COMMERCIAL/PUBLIC VENUE TEMPLATES
// ============================================

export const RESTAURANT_AUDIO: SystemTemplate = {
  id: 'restaurant_audio',
  name: 'Restaurant Background Music System',
  description: 'Multi-zone background music with separate volume control',
  use_case: 'Restaurant, bar, or hospitality venue',
  budget_range: 'R30,000 - R150,000',
  requirements: [
    {
      id: 'streaming_amp',
      name: 'Streaming Amplifier',
      description: 'Network audio amplifier with Spotify, AirPlay, etc.',
      status: 'missing',
      category_keywords: ['wiim', 'heos', 'streaming amp', 'network amp', 'sonos amp'],
    },
    {
      id: 'ceiling_speakers',
      name: 'Commercial Ceiling Speakers',
      description: '6-12 speakers for even coverage',
      status: 'missing',
      quantity_needed: 8,
      category_keywords: ['ceiling speaker', 'in-ceiling', 'commercial speaker'],
    },
    {
      id: 'zone_controller',
      name: 'Volume Controls (Per Zone)',
      description: 'Wall-mounted volume controls',
      status: 'missing',
      optional: true,
      category_keywords: ['volume control', 'wall control', 'zone control'],
    },
    {
      id: 'cables',
      name: 'Speaker Cable',
      description: 'Installation cable for all speakers',
      status: 'missing',
      optional: true,
      category_keywords: ['speaker cable', 'installation wire'],
    },
  ],
};

export const GYM_AUDIO: SystemTemplate = {
  id: 'gym_audio',
  name: 'Gym/Fitness Center Audio System',
  description: 'High-energy audio system for fitness spaces',
  use_case: 'Gym, fitness studio, or training facility',
  budget_range: 'R50,000 - R200,000',
  requirements: [
    {
      id: 'amplifier',
      name: 'Commercial Amplifier',
      description: 'High-power amplifier for large space',
      status: 'missing',
      category_keywords: ['amplifier', 'power amp', 'commercial amp'],
    },
    {
      id: 'ceiling_speakers',
      name: 'High-Output Ceiling Speakers',
      description: '8-16 speakers for loud, clear audio',
      status: 'missing',
      quantity_needed: 12,
      category_keywords: ['ceiling speaker', 'commercial speaker', 'gym speaker'],
    },
    {
      id: 'subwoofer',
      name: 'Commercial Subwoofer',
      description: 'For bass and energy',
      status: 'missing',
      optional: true,
      category_keywords: ['subwoofer', 'sub', 'bass'],
    },
    {
      id: 'media_player',
      name: 'Media Player/Streamer',
      description: 'For music playback',
      status: 'missing',
      category_keywords: ['media player', 'streamer', 'bluetooth receiver', 'source'],
    },
  ],
};

export const WORSHIP_AUDIO: SystemTemplate = {
  id: 'worship_audio',
  name: 'House of Worship Audio System',
  description: 'Professional sound reinforcement for worship services',
  use_case: 'Church, synagogue, mosque, or temple',
  budget_range: 'R80,000 - R500,000+',
  requirements: [
    {
      id: 'mixer',
      name: 'Digital Mixing Console',
      description: '16-32 channel digital mixer',
      status: 'missing',
      category_keywords: ['mixer', 'console', 'mixing desk', 'digital mixer'],
    },
    {
      id: 'main_speakers',
      name: 'Main PA Speakers',
      description: 'Line array or point-source mains',
      status: 'missing',
      quantity_needed: 2,
      category_keywords: ['pa speaker', 'main speaker', 'line array', 'powered speaker'],
    },
    {
      id: 'subwoofers',
      name: 'Subwoofers',
      description: 'For low-end support',
      status: 'missing',
      quantity_needed: 2,
      category_keywords: ['subwoofer', 'sub', 'bass'],
    },
    {
      id: 'wireless_mics',
      name: 'Wireless Microphones',
      description: 'For pastor/speakers',
      status: 'missing',
      quantity_needed: 2,
      category_keywords: ['wireless mic', 'handheld', 'lavalier', 'headset'],
    },
    {
      id: 'monitors',
      name: 'Stage Monitors',
      description: 'For musicians/choir',
      status: 'missing',
      optional: true,
      category_keywords: ['monitor', 'stage monitor', 'wedge'],
    },
  ],
};

export const EDUCATION_AUDIO: SystemTemplate = {
  id: 'education_audio',
  name: 'Education/Training Room System',
  description: 'Classroom or lecture hall AV system',
  use_case: 'School, university, or training facility',
  budget_range: 'R40,000 - R200,000',
  requirements: [
    {
      id: 'display',
      name: 'Interactive Display or Projector',
      description: '75-86" interactive panel or projector',
      status: 'missing',
      category_keywords: ['display', 'interactive', 'projector', 'smartboard'],
    },
    {
      id: 'speakers',
      name: 'Ceiling or Wall Speakers',
      description: '4-6 speakers for clear audio',
      status: 'missing',
      quantity_needed: 4,
      category_keywords: ['ceiling speaker', 'wall speaker', 'speaker'],
    },
    {
      id: 'wireless_mic',
      name: 'Wireless Microphone System',
      description: 'For instructor',
      status: 'missing',
      category_keywords: ['wireless mic', 'lavalier', 'headset'],
    },
    {
      id: 'amplifier',
      name: 'Amplifier/Mixer',
      description: 'For audio distribution',
      status: 'missing',
      category_keywords: ['amplifier', 'mixer', 'audio processor'],
    },
    {
      id: 'video_conference',
      name: 'Video Conference Camera',
      description: 'For remote/hybrid learning',
      status: 'missing',
      optional: true,
      category_keywords: ['camera', 'video conference', 'ptz'],
    },
  ],
};

export const CLUB_AUDIO: SystemTemplate = {
  id: 'club_audio',
  name: 'Club/Entertainment Venue System',
  description: 'High-energy sound and lighting for nightlife',
  use_case: 'Nightclub, bar, or entertainment venue',
  budget_range: 'R100,000 - R1,000,000+',
  requirements: [
    {
      id: 'main_pa',
      name: 'Main PA System',
      description: 'High-power speakers for dance floor',
      status: 'missing',
      quantity_needed: 2,
      category_keywords: ['pa speaker', 'powered speaker', 'main speaker'],
    },
    {
      id: 'subwoofers',
      name: 'Subwoofers (Multiple)',
      description: 'For massive bass impact',
      status: 'missing',
      quantity_needed: 4,
      category_keywords: ['subwoofer', 'sub', 'bass'],
    },
    {
      id: 'dj_mixer',
      name: 'DJ Mixer',
      description: 'For DJ performance',
      status: 'missing',
      category_keywords: ['dj mixer', 'mixer', 'pioneer', 'djm'],
    },
    {
      id: 'amplifiers',
      name: 'Power Amplifiers',
      description: 'High-power amps for speakers',
      status: 'missing',
      quantity_needed: 2,
      category_keywords: ['amplifier', 'power amp'],
    },
    {
      id: 'lighting',
      name: 'DMX Lighting System',
      description: 'Moving heads, wash lights, etc.',
      status: 'missing',
      optional: true,
      category_keywords: ['lighting', 'dmx', 'moving head', 'led'],
    },
  ],
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get appropriate system template based on chat context
 */
export function detectSystemType(chatContext: {
  use_case?: string;
  room_size?: string;
  participants?: number;
  chat_type?: string;
}): SystemTemplate | null {
  const { use_case, room_size, participants, chat_type } = chatContext;

  // Business/Commercial video conferencing detection
  if (chat_type === 'business' || use_case?.toLowerCase().includes('conference')) {
    if (participants && participants <= 6) {
      return VIDEO_CONFERENCE_HUDDLE;
    } else if (participants && participants <= 14) {
      return VIDEO_CONFERENCE_BOARDROOM;
    } else if (participants && participants >= 15) {
      return VIDEO_CONFERENCE_LARGE;
    }
    // Default to boardroom if no clear size
    return VIDEO_CONFERENCE_BOARDROOM;
  }

  // Restaurant/Hospitality detection
  if (chat_type === 'restaurant') {
    return RESTAURANT_AUDIO;
  }

  // Gym/Fitness detection
  if (chat_type === 'gym') {
    return GYM_AUDIO;
  }

  // Worship/Religious venue detection
  if (chat_type === 'worship') {
    return WORSHIP_AUDIO;
  }

  // Education/Training detection
  if (chat_type === 'education') {
    return EDUCATION_AUDIO;
  }

  // Club/Entertainment detection
  if (chat_type === 'club') {
    return CLUB_AUDIO;
  }

  // Home audio detection - ONLY if user explicitly mentions cinema/atmos/multiroom
  // Don't auto-template for 'home' tab since it could be Control4, lighting, security, etc.
  if (use_case?.toLowerCase().includes('cinema') || use_case?.toLowerCase().includes('atmos') || use_case?.toLowerCase().includes('dolby')) {
    return HOME_CINEMA_5_1_4;
  }

  // Multiroom detection
  if (use_case?.toLowerCase().includes('multiroom') || use_case?.toLowerCase().includes('whole home')) {
    return MULTIROOM_AUDIO;
  }

  // Home/Tender tabs - too generic, don't force templates
  if (chat_type === 'home' || chat_type === 'tender') {
    return null;
  }

  return null;
}

/**
 * Update requirement status based on products in quote
 */
export function updateRequirementStatus(
  requirement: SystemRequirement,
  productsInQuote: Array<{ id: string; name: string; category: string; quantity: number }>
): SystemRequirement {
  const matchingProducts = productsInQuote.filter((product) => {
    const productText = `${product.name} ${product.category}`.toLowerCase();
    const productName = product.name.toLowerCase();

    // Check if product matches any keywords
    const hasKeywordMatch = requirement.category_keywords.some((keyword) =>
      productText.includes(keyword.toLowerCase())
    );

    if (!hasKeywordMatch) return false;

    // Apply negative filters to prevent wrong matches
    if (requirement.id === 'ceiling_mics' || requirement.id === 'mic_array') {
      // Ceiling mics should NOT be handheld/wired mics
      if (productName.includes('handheld') ||
          productName.includes('wired mic') ||
          productName.includes('sv100') ||
          productName.includes('sm58') ||
          productName.includes('beta 58')) {
        return false;
      }
      // MUST include ceiling/array keywords for ceiling mic requirements
      if (!productName.includes('ceiling') &&
          !productName.includes('mxa') &&
          !productName.includes('array') &&
          !productName.includes('beamforming')) {
        return false;
      }
    }

    return true;
  });

  if (matchingProducts.length === 0) {
    return {
      ...requirement,
      status: requirement.status === 'critical' ? 'critical' : 'missing',
      quantity_have: 0,
      covered_by: [],
    };
  }

  // Calculate total quantity with special handling for known models
  let totalQuantity = 0;
  matchingProducts.forEach((p) => {
    const productName = p.name.toLowerCase();

    // Special case: MVC940 contains 2x PTZ cameras
    if (requirement.id === 'ptz_cameras' || requirement.id === 'ptz_camera') {
      if (productName.includes('mvc940') || productName.includes('mvc 940')) {
        totalQuantity += 2 * p.quantity; // Each MVC940 has 2 PTZ cameras
        return;
      }
    }

    // Default: count product quantity as-is
    totalQuantity += p.quantity;
  });

  const productIds = matchingProducts.map((p) => p.id);

  if (requirement.quantity_needed) {
    if (totalQuantity >= requirement.quantity_needed) {
      return {
        ...requirement,
        status: 'complete',
        quantity_have: totalQuantity,
        covered_by: productIds,
        note: undefined,
      };
    } else {
      return {
        ...requirement,
        status: 'partial',
        quantity_have: totalQuantity,
        covered_by: productIds,
        note: `Need ${requirement.quantity_needed}, have ${totalQuantity}`,
      };
    }
  }

  // No specific quantity needed, just check if present
  return {
    ...requirement,
    status: 'complete',
    quantity_have: totalQuantity,
    covered_by: productIds,
  };
}

/**
 * Get all system templates
 */
export function getAllSystemTemplates(): SystemTemplate[] {
  return [
    VIDEO_CONFERENCE_HUDDLE,
    VIDEO_CONFERENCE_BOARDROOM,
    VIDEO_CONFERENCE_LARGE,
    HOME_CINEMA_5_1_4,
    MULTIROOM_AUDIO,
  ];
}
