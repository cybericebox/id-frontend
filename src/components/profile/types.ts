// Shape of GET /api/auth/account (daemon authModel.AccountInfo, PascalCase JSON).
export interface Account {
  FirstName: string
  LastName: string
  Email: string
  Picture: string
  EmailConfirmed: boolean
  Role: string
  Providers: string[]
  HasPassword: boolean
  CreatedAt: string
}

// Shape of one entry in GET /api/auth/sessions (authModel.SessionInfo).
export interface SessionInfo {
  ID: string
  UserAgent: string
  IP: string
  LastSeen: string
  CreatedAt: string
  IsCurrent: boolean
}
