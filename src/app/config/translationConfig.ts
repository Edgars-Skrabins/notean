export enum Language {
  English = 'en',
  Latvian = 'lv'
}

export const supportedTranslations = [
  Language.English,
  Language.Latvian,
]

export const defaultLanguage = Language.English

export enum TranslationPhrase {
  Dashboard = "Dashboard",
  Settings = "Settings",
  Workspaces = "Workspaces",
  Profile = "Profile",
  Login = "Login",
  Register = "Register",
  Logout = "Logout",
  ForgotPassword = "ForgotPassword",
  ChangePassword = "ChangePassword",
  Notes = "Notes",
  Tasks = "Tasks",
  EnterEmail = "EnterEmail",
  EnterPassword = "EnterPassword",
  Password = "Password",
  ConfirmPassword = "ConfirmPassword",
  Email = "Email",
  AlreadyHaveAnAccount = "AlreadyHaveAnAccount",
  DoNotHaveAnAccount = "DoNotHaveAnAccount",
}
