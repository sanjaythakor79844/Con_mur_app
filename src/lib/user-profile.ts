// User profile management
// Store additional user details (name, age, gender) in localStorage
// In production, you should use Firestore or your backend API

export interface UserProfile {
  uid: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: "male" | "female" | "other";
  createdAt: string;
}

const STORAGE_KEY = "aaha_user_profile";

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error("Failed to save user profile:", error);
  }
}

export function getUserProfile(): UserProfile | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as UserProfile;
  } catch (error) {
    console.error("Failed to get user profile:", error);
    return null;
  }
}

export function clearUserProfile(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear user profile:", error);
  }
}
