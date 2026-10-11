import type { CommunityHeroProps } from "./community-hero";
import type { MarqueeImage } from "./photo-marquee";
import photo01 from "@/public/images/community/01.jpg";
import photo02 from "@/public/images/community/02.jpg";
import photo03 from "@/public/images/community/03.jpg";
import photo04 from "@/public/images/community/04.jpg";
import photo05 from "@/public/images/community/05.jpg";
import photo06 from "@/public/images/community/06.jpg";
import photo07 from "@/public/images/community/07.jpg";
import photo08 from "@/public/images/community/08.jpg";
import photo09 from "@/public/images/community/09.jpg";
import photo10 from "@/public/images/community/10.jpg";
import photo11 from "@/public/images/community/11.jpg";
import photo12 from "@/public/images/community/12.jpg";
import photo13 from "@/public/images/community/13.jpg";
import photo14 from "@/public/images/community/14.jpg";
import photo15 from "@/public/images/community/15.jpg";
import photo16 from "@/public/images/community/16.jpg";
import photo17 from "@/public/images/community/17.jpg";
import photo18 from "@/public/images/community/18.jpg";
import photo19 from "@/public/images/community/19.jpg";
import photo20 from "@/public/images/community/20.jpg";
import photo21 from "@/public/images/community/21.jpg";
import photo22 from "@/public/images/community/22.jpg";
import photo23 from "@/public/images/community/23.jpg";
import photo24 from "@/public/images/community/24.jpg";
import photo25 from "@/public/images/community/25.jpg";
import photo26 from "@/public/images/community/26.jpg";
import photo27 from "@/public/images/community/27.jpg";
import photo28 from "@/public/images/community/28.jpg";
import photo29 from "@/public/images/community/29.jpg";
import photo30 from "@/public/images/community/30.jpg";
import photo31 from "@/public/images/community/31.jpg";
import photo32 from "@/public/images/community/32.jpg";
import photo33 from "@/public/images/community/33.jpg";
import photo34 from "@/public/images/community/34.jpg";
import photo35 from "@/public/images/community/35.jpg";
import photo36 from "@/public/images/community/36.jpg";
import photo37 from "@/public/images/community/37.jpg";
import photo38 from "@/public/images/community/38.jpg";
import photo39 from "@/public/images/community/39.jpg";
import photo40 from "@/public/images/community/40.jpg";
import photo41 from "@/public/images/community/41.jpg";
import photo42 from "@/public/images/community/42.jpg";
import photo43 from "@/public/images/community/43.jpg";
import photo44 from "@/public/images/community/44.jpg";
import photo45 from "@/public/images/community/45.jpg";
import photo46 from "@/public/images/community/46.jpg";
import photo47 from "@/public/images/community/47.jpg";
import photo48 from "@/public/images/community/48.jpg";

/**
 * The photo wall, dealt out to the rows in turn: with three rows, photos 1, 4, 7… make the first row,
 * 2, 5, 8… the second and 3, 6, 9… the third. 16 photos per row (48 for three rows) means no face ever
 * shows twice on screen, even at 2560px; with fewer, each row repeats its own photos.
 *
 * Demo photos from Unsplash (Unsplash License, credits in PHOTOS.md): replace them with your own
 * community's photos. 4:3 crops of at least 640 × 480 look sharpest. Static imports give each photo a
 * blurred preview while it loads; plain paths such as "/images/community/01.jpg" or CDN URLs work too.
 */
export const communityImages: MarqueeImage[] = [
  { src: photo01, alt: "Woman with long dark hair laughing, in a red top" },
  { src: photo02, alt: "Man in glasses laughing outdoors" },
  { src: photo03, alt: "Woman with dark hair smiling outdoors" },
  { src: photo04, alt: "Man with dark hair and a soft smile" },
  { src: photo05, alt: "Woman with short natural hair smiling, in a white top" },
  { src: photo06, alt: "Man in glasses with his hand on his chin" },
  { src: photo07, alt: "Woman with natural curly hair smiling, in a yellow patterned top" },
  { src: photo08, alt: "Man in glasses smiling, in a black top" },
  { src: photo09, alt: "Woman with a dark bob in a white shirt" },
  { src: photo10, alt: "Older man with glasses smiling in front of a chalkboard" },
  { src: photo11, alt: "Woman with shoulder-length dark hair in a gray sweater" },
  { src: photo12, alt: "Young man in a dark blue sweater laughing" },
  { src: photo13, alt: "Woman with long hair in a gray blazer" },
  { src: photo14, alt: "Man with short dark hair smiling" },
  { src: photo15, alt: "Woman with auburn hair in a navy blazer smiling" },
  { src: photo16, alt: "Man with a short beard smiling broadly" },
  { src: photo17, alt: "Woman with red hair and glasses in a red jacket" },
  { src: photo18, alt: "Man with a beard in a black hoodie" },
  { src: photo19, alt: "Woman with long dark hair smiling warmly" },
  { src: photo20, alt: "Man with curly hair, glasses and a beard smiling" },
  { src: photo21, alt: "Young woman with long dark hair outdoors" },
  { src: photo22, alt: "Man with a beard in a black turtleneck" },
  { src: photo23, alt: "Woman with long dark hair looking at the camera" },
  { src: photo24, alt: "Man with a beard smiling at his desk" },
  { src: photo25, alt: "Woman with curly hair smiling, her hand in her hair" },
  { src: photo26, alt: "Young man in glasses and a gray hoodie" },
  { src: photo27, alt: "Woman with short natural hair in a yellow blazer" },
  { src: photo28, alt: "Man with a beard smiling, in a white shirt" },
  { src: photo29, alt: "Woman with long dark hair smiling in front of a colorful wall" },
  { src: photo30, alt: "Older man with a gray beard smiling" },
  { src: photo31, alt: "Woman with blonde hair smiling, in a red top and black jacket" },
  { src: photo32, alt: "Man smiling outdoors in a gray T-shirt" },
  { src: photo33, alt: "Woman in glasses smiling with her arms crossed" },
  { src: photo34, alt: "Man in round glasses resting his chin on his hand" },
  { src: photo35, alt: "Woman with dark hair in a checked shirt, smiling softly" },
  { src: photo36, alt: "Young man with dark hair smiling" },
  { src: photo37, alt: "Woman with short bleached hair laughing outdoors" },
  { src: photo38, alt: "Man in a dark suit smiling" },
  { src: photo39, alt: "Woman in a lab coat and glasses in front of a blackboard" },
  { src: photo40, alt: "Man in a light denim shirt" },
  { src: photo41, alt: "Woman with her hair in a bun smiling against an orange wall" },
  { src: photo42, alt: "Young person with curly hair and glasses smiling outdoors" },
  { src: photo43, alt: "Woman in round glasses in front of a graffiti wall" },
  { src: photo44, alt: "Man with a ginger beard smiling, hand on his chin" },
  { src: photo45, alt: "Woman laughing with her hands on her cheeks" },
  { src: photo46, alt: "Bald man with a big smile" },
  { src: photo47, alt: "Woman with long dark hair smiling, in a burgundy cardigan" },
  { src: photo48, alt: "Man with a beard in a white shirt" },
];

export const communityHero = {
  badge: "Global Network",
  title: "Join 50,000+ cognitive pioneers from 180+ countries",
  description:
    "Connect with neuroscience researchers, peak performers, and cognitive enhancement enthusiasts pushing the boundaries of human potential.",
  cta: { label: "Join Neural Network", href: "#join" },
  images: communityImages,
} satisfies CommunityHeroProps;
