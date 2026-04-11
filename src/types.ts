export interface YieldRecord {
  id?: string;
  date: string;
  cropType: string;
  location: string;
  quantity: number;
  unit: string;
  grade?: string;
  notes?: string;
  userId: string;
}

export interface ActivityRecord {
  id?: string;
  date: string;
  type: 'Fertilization' | 'Herbicide' | 'Fungicide' | 'FertilizerWater' | 'BactericideWater' | 'TraceElements' | 'Other';
  cropType: string;
  location: string;
  materialUsed: string;
  quantity: number;
  unit: string;
  area: string;
  notes?: string;
  userId: string;
  status?: 'Pending' | 'Completed';
}

export interface Location {
  id?: string;
  name: string;
  description?: string;
  userId: string;
}

export interface KnowledgeItem {
  id?: string;
  title: string;
  content?: string;
  category: string;
  cropType: string;
  folderId?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  createdAt: string;
  userId: string;
}

export interface KnowledgeFolder {
  id?: string;
  name: string;
  parentId?: string;
  userId: string;
  createdAt: string;
}

export interface WeatherRecord {
  id?: string;
  date: string;
  condition: 'Sunny' | 'Rainy' | 'Cloudy' | 'Stormy';
  temperature?: number;
  rainfall?: number;
  notes?: string;
  userId: string;
}

export interface Worker {
  id?: string;
  name: string;
  phone?: string;
  idNumber?: string;
  nationality?: string;
  joinDate?: string;
  salary?: number;
  position?: string;
  notes?: string;
  active: boolean;
  userId: string;
}

export interface Crop {
  id?: string;
  name: string;
  userId: string;
}

export interface AttendanceRecord {
  id?: string;
  date: string;
  workerIds: string[];
  cropType: string;
  notes?: string;
  userId: string;
}

export interface Note {
  id?: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  color?: string;
  isPinned?: boolean;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
