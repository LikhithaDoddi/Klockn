import { create } from 'zustand'

export interface GroupMember {
  id: string
  name: string | null
  email: string
  status: string
  busyPeriods: BusyPeriod[]
}

export interface BusyPeriod {
  date: string        // 'YYYY-MM-DD'
  startMinute: number // 0–1439
  endMinute: number   // 0–1439
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
