import { create } from 'zustand'

export interface GroupMember {
  id: string
  name: string | null
  email: string
  status: string
  availability: MemberSlot[]
}

export interface MemberSlot {
  date: string   // 'YYYY-MM-DD'
  hour: number   // 0–23
  free: boolean
}

export interface Group {
  id: string
  name: string
  memberCount?: number
  createdAt: string
}

interface GroupState {
  groups: Group[]
  setGroups: (groups: Group[]) => void
  addGroup: (group: Group) => void
}

export const useGroupStore = create<GroupState>((set) => ({
  groups: [],
  setGroups: (groups) => set({ groups }),
  addGroup: (group) => set((s) => ({ groups: [group, ...s.groups] })),
}))
