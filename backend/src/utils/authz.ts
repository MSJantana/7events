export function isAdmin(req: any) {
  return req.user?.role === 'ADMIN'
}

export function isOwner(req: any, ownerId: string) {
  return req.user?.sub === ownerId
}
