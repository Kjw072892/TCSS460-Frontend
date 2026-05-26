type SessionUserLike = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export const DEV_AUTH_SIMULATION_ENABLED =
  process.env.NODE_ENV === "development";

export const DEV_SIMULATED_USER: SessionUserLike = {
  id: "dev-john-doe",
  name: "John Doe",
  email: "john.doe@example.com",
  image: null,
};

export function getEffectiveUser(user?: SessionUserLike | null) {
  return user ?? (DEV_AUTH_SIMULATION_ENABLED ? DEV_SIMULATED_USER : undefined);
}
