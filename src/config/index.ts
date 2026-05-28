/**
 * Application configuration
 * Centralized settings for the TCSS 460 demo application
 */

export const APP_CONFIG = {
  course: {
    code: "TCSS 460",
    name: "Client/Server Programming for Internet Applications",
    semester: "Spring 2026",
    university: "UW Tacoma",
    school: "School of Engineering and Technology",
  },

  app: {
    title: "7MDB",
    description: "Explore popular movies and TV shows",
  },

  routes: {
    home: "/",
    dashboard: "/dashboard",
    messagesPublic: "/messages",
    messagesView: "/messages/view",
    messagesSend: "/messages/send",
    debug: "/debug",
    profile: "/profile",
    userReviews: "/profile/reviews",
    search: "/search",
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
