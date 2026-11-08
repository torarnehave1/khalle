export interface CinemaTerm {
  id: string;
  label: string;
  category: 'perspective' | 'zoom_motion' | 'lighting' | 'physics';
  icon: string;
  tagline: string;
  explanation: string;
  promptSnippet: string;
  exampleUse: string;
}

export const CINEMA_PERSPECTIVES: CinemaTerm[] = [
  {
    id: 'low-angle-hero',
    label: 'Low-Angle Hero Shot',
    category: 'perspective',
    icon: '📐',
    tagline: 'Camera low looking up at the sky',
    explanation: 'Angles the camera upward from the wildflower grass toward the sky, making the plush rabbit look monumental, heroic, and towering against the alpine mountain peaks.',
    promptSnippet: 'cinematic low-angle heroic perspective looking upward from ground level toward the rabbit leaping against snow-capped alpine peaks',
    exampleUse: 'Makes jumps feel twice as high and dynamic.',
  },
  {
    id: 'eye-level-closeup',
    label: 'Eye-Level Close-Up',
    category: 'perspective',
    icon: '👀',
    tagline: 'Direct, intimate face-to-face height',
    explanation: 'Positions the camera directly at the rabbit’s eye height, maximizing emotional connection, facial expressions, pink button nose, and bouncy floppy ears.',
    promptSnippet: 'intimate eye-level close-up shot centered on the cute plush rabbit smiling cheerfully',
    exampleUse: 'Best for showcasing joyful expressions and cute face details.',
  },
  {
    id: 'worms-eye-ground',
    label: 'Ground-Level Worm’s Eye',
    category: 'perspective',
    icon: '🌱',
    tagline: 'Skimming the grass and clover',
    explanation: 'Hugs the alpine meadow floor directly in front of the rabbit’s red boots, emphasizing the physical crouch, spring-loaded feet, and explosive upward lift-off.',
    promptSnippet: 'extreme ground-level worm’s eye view skimming alpine clover as the red boots compress and spring upward',
    exampleUse: 'Emphasizes launch power, boots, and flying clover petals.',
  },
  {
    id: 'birds-eye-aerial',
    label: 'High-Angle Aerial View',
    category: 'perspective',
    icon: '🦅',
    tagline: 'Looking down from elevated height',
    explanation: 'Angles the lens down from an elevated vantage point, showcasing the sprawling tapestry of yellow wildflowers, alpine trails, and the rabbit’s curved bounce path.',
    promptSnippet: 'high-angle bird’s eye aerial view looking down as the rabbit leaps across the vibrant mountain wildflower meadow',
    exampleUse: 'Great for showing distance traveled and colorful flower patterns.',
  },
  {
    id: 'over-shoulder-scenic',
    label: 'Over-the-Shoulder Scenic',
    category: 'perspective',
    icon: '🏔️',
    tagline: 'Framing past the rabbit to the horizon',
    explanation: 'Frames from just behind the plush bunny’s floppy green ear looking forward into the sweeping mountain range, conveying a sense of epic alpine adventure.',
    promptSnippet: 'over-the-shoulder shot framing past the bunny’s floppy green ear toward the vast panoramic mountain valley',
    exampleUse: 'Instantly adds cinematic scale and wanderlust to the clip.',
  },
  {
    id: 'macro-plush-detail',
    label: 'Macro Plush Texture',
    category: 'perspective',
    icon: '🔍',
    tagline: 'Ultra-detailed fabric & stitch focus',
    explanation: 'Tells the AI to render hyper-tactile plush yarn, individual soft fuzzy green fibers, embroidered eyes, and stitched red boot laces with shallow depth of field.',
    promptSnippet: 'macro shot with shallow depth of field highlighting tactile fuzzy green plush fur and embroidered smiling features',
    exampleUse: 'Creates ultra-realistic physical toy craftsmanship aesthetics.',
  },
];

export const CINEMA_ZOOM_AND_MOTIONS: CinemaTerm[] = [
  {
    id: 'slow-push-in-zoom',
    label: 'Slow Push-In / Zoom In',
    category: 'zoom_motion',
    icon: '🔍',
    tagline: 'Smoothly tightens framing toward subject',
    explanation: 'Gradually tightens the camera framing toward the rabbit during the jump. In AI video diffusion, this provides clear optical flow vectors that draw viewer focus to the smiling face.',
    promptSnippet: 'smooth cinematic slow push-in zoom steadily tightening focus onto the rabbit’s joyful face in mid-air',
    exampleUse: 'Builds excitement and focus during the height of the action.',
  },
  {
    id: 'dramatic-pull-back-zoom',
    label: 'Dramatic Pull-Back / Zoom Out',
    category: 'zoom_motion',
    icon: '🔭',
    tagline: 'Starts tight, zooms out to panoramic wide',
    explanation: 'Starts close on the rabbit’s boots or face, then smoothly pulls backward to reveal the breathtaking alpine peaks, blue skies, and blooming mountain meadows.',
    promptSnippet: 'dramatic pull-back zoom out expanding from a close shot into a grand panoramic wide-angle vista of the alpine valley',
    exampleUse: 'Perfect for grand reveals and scene transitions.',
  },
  {
    id: 'dynamic-tracking-pan',
    label: 'Dynamic Tracking Pan',
    category: 'zoom_motion',
    icon: '🏃',
    tagline: 'Moves alongside subject in motion',
    explanation: 'The camera moves horizontally at the same speed as the rabbit. The subject stays sharp in frame while the mountain background glides past with cinematic motion blur.',
    promptSnippet: 'dynamic lateral tracking shot gliding smoothly alongside the rabbit in mid-flight with rich parallax motion blur',
    exampleUse: 'Communicates speed, forward momentum, and joyful flight.',
  },
  {
    id: 'orbital-360-arc',
    label: 'Orbital 180° / 360° Arc',
    category: 'zoom_motion',
    icon: '🔄',
    tagline: 'Sweeps in an arc around the subject',
    explanation: 'The camera sweeps around the floating rabbit in a semicircular arc, creating stunning 3D stereoscopic parallax between the rabbit and the distant snow peaks.',
    promptSnippet: 'smooth orbital camera arc sweeping in a 180-degree curve around the floating plush bunny showcasing alpine depth',
    exampleUse: 'Showcases full 3D dimensionality of the plush toy.',
  },
  {
    id: 'crane-shot-ascend',
    label: 'Crane Shot Lift-Up',
    category: 'zoom_motion',
    icon: '🏗️',
    tagline: 'Ascends vertically into the sky',
    explanation: 'Simulates a camera crane lifting upward in tandem with the jump, rising above the flowers to keep the rabbit centered as the ground falls away below.',
    promptSnippet: 'cinematic crane shot lifting vertically into the sky following the plush rabbit’s energetic upward leap',
    exampleUse: 'Makes the jump feel weightless and soaring.',
  },
  {
    id: 'drone-shot-sound',
    label: 'Drone Fly-Over (With Sound)',
    category: 'zoom_motion',
    icon: '🛸',
    tagline: 'FPV sweep with wind & birdsong audio',
    explanation: 'High-speed cinematic FPV drone sweeping low over the alpine meadow, banking dynamically around the jumping rabbit, accompanied by rich natural audio: whistling mountain breeze, meadow birdsong, and playful bounce foley.',
    promptSnippet: 'cinematic sweeping FPV drone fly-over shot banking dynamically around the plush rabbit as it leaps toward snowy peaks, accompanied by rich immersive natural audio: whistling alpine wind, meadow birdsong, and playful bouncy foley sound effects',
    exampleUse: 'Gives sweeping cinematic velocity with full sound design.',
  },
  {
    id: 'drone-shot-silent',
    label: 'Drone Fly-Over (Silent / No Sound)',
    category: 'zoom_motion',
    icon: '🚁',
    tagline: 'Breathtaking stabilized silent aerial glide',
    explanation: 'Silky-smooth stabilized aerial drone shot soaring over wildflower meadows, tracking the rabbit’s high leap with zero audio, creating a peaceful dreamlike slow-motion alpine flight.',
    promptSnippet: 'breathtaking silent aerial drone fly-over shot gliding in smooth stabilized slow-motion over blooming alpine wildflowers, tracking the rabbit’s high leap with pure visual elegance and no sound',
    exampleUse: 'Perfect for serene, elegant, high-production visuals.',
  },
  {
    id: 'stationary-locked-tripod',
    label: 'Locked-Off Tripod Shot',
    category: 'zoom_motion',
    icon: '📷',
    tagline: 'Stable stationary camera',
    explanation: 'Keeps the camera completely static, letting the rabbit’s rapid entrance, high leap, and snappy landing provide all internal motion.',
    promptSnippet: 'stationary locked-off camera on tripod framing the alpine meadow as the energetic rabbit leaps high through frame',
    exampleUse: 'Best for classic animation clarity and crisp background detail.',
  },
];

export const CINEMA_LIGHTINGS: CinemaTerm[] = [
  {
    id: 'golden-sunbeams',
    label: 'Volumetric Golden Sunbeams',
    category: 'lighting',
    icon: '✨',
    tagline: 'Warm rays piercing misty air',
    explanation: 'Warm sunlight streams through alpine mountain mist, casting glowing god-rays and rim lighting across the fuzzy green fur and floating dandelion seeds.',
    promptSnippet: 'bathed in golden hour volumetric sunbeams with warm amber rim light catching the plush fur texture',
    exampleUse: 'Adds magical fairy-tale warmth and atmospheric depth.',
  },
  {
    id: 'crisp-alpine-sun',
    label: 'Crisp Alpine Sunlight',
    category: 'lighting',
    icon: '☀️',
    tagline: 'Brilliant high-contrast clarity',
    explanation: 'Bright crystalline high-altitude daylight with vivid wildflower colors, sparkling dew, and crisp natural contrast with distant snow.',
    promptSnippet: 'crisp high-altitude alpine sunlight with vibrant saturated wildflower colors and clear mountain contrast',
    exampleUse: 'Gives punchy, vibrant commercial-grade clarity.',
  },
  {
    id: 'sunset-rim-glow',
    label: 'Sunset Rim Silhouette',
    category: 'lighting',
    icon: '🌅',
    tagline: 'Backlit amber halo on plush edges',
    explanation: 'Warm twilight backlighting creating a sharp luminous contour around the rabbit’s floppy ears and whiskers against an orange-violet sky.',
    promptSnippet: 'dramatic sunset backlighting creating a warm luminous rim glow outlining the rabbit’s floppy ears and silhouette',
    exampleUse: 'Creates dramatic, emotional, cinematic story beats.',
  },
  {
    id: 'soft-diffused-overcast',
    label: 'Soft Diffused Overcast Glow',
    category: 'lighting',
    icon: '☁️',
    tagline: 'Velvety shadowless illumination',
    explanation: 'Gentle, even mountain light that eliminates harsh shadows and makes the emerald green fur and red boots pop with velvety rich saturation.',
    promptSnippet: 'soft diffused mountain lighting providing velvety rich textures and shadowless color fidelity',
    exampleUse: 'Best for faithful character colors and gentle moods.',
  },
];

export const CINEMA_PHYSICS: CinemaTerm[] = [
  {
    id: 'apex-hangtime',
    label: 'Slow-Motion Apex Hangtime',
    category: 'physics',
    icon: '⏱️',
    tagline: 'Weightless pause at top of jump',
    explanation: 'Directs the model to dilate time at the peak of the leap, letting the floppy ears flutter gracefully in the mountain breeze before falling.',
    promptSnippet: 'slow-motion apex hangtime at peak height with floppy ears fluttering weightlessly in the mountain breeze',
    exampleUse: 'Gives the leap theatrical emphasis and beauty.',
  },
  {
    id: 'snappy-spring-bounce',
    label: 'Snappy Spring Compression',
    category: 'physics',
    icon: '⚡',
    tagline: 'Energetic bounce and boot kick',
    explanation: 'Emphasizes springy compression of the plush rabbit before launch, followed by an energetic boot-kick and snappy landing with grass flutter.',
    promptSnippet: 'snappy spring-loaded compression into an explosive jump with kicking red boots and energetic bounce physics',
    exampleUse: 'Maximizes playful cartoon energy and excitement.',
  },
];

export const ALL_CINEMA_TERMS = [
  ...CINEMA_PERSPECTIVES,
  ...CINEMA_ZOOM_AND_MOTIONS,
  ...CINEMA_LIGHTINGS,
  ...CINEMA_PHYSICS,
];
