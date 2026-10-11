import type { InteractiveHeroProps } from "./types";

/** The demo content. The product, the project and every person named here are fictional. */
export const interactiveHero = {
  badge: { label: "New: Instant publish with atomic deploys", href: "#changelog" },
  title: "Ship websites at lightspeed",
  highlight: "lightspeed",
  description:
    "{productName} is a visual builder that lets you design, collaborate, and publish in one place. No code required—unless you want it.",
  primaryCta: { label: "Try for free", href: "#signup" },
  secondaryCta: { label: "Watch demo", videoSrc: "/videos/demo.mp4" },
  socialProof: {
    avatars: [
      { src: "/avatars/lena-park.jpg", name: "Lena Park", role: "Design Lead, Fieldline" },
      { src: "/avatars/marcus-hill.jpg", name: "Marcus Hill", role: "Founder, Hillworks" },
      { src: "/avatars/sofia-reyes.jpg", name: "Sofia Reyes", role: "Marketing, Northbeam" },
      { src: "/avatars/james-okoro.jpg", name: "James Okoro", role: "Engineer, Parcelry" },
      { src: "/avatars/hana-mori.jpg", name: "Hana Mori", role: "Product, Lumora" },
    ],
    rating: 4.9,
    count: 2400,
    label: "Trusted by {count}+ teams",
  },
  demo: { productName: "Nebula", projectName: "Aurora", enableTour: true, enableCollaborators: true },
  accent: "sky",
  theme: "auto",
} satisfies InteractiveHeroProps;
