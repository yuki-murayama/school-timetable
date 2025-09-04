/**
 * 認証統合APIクライアント
 * 認証コンテキストと型安全APIクライアントを統合
 */

import { useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import type { TypeSafeApiOptions } from './type-safe-client'
import { classroomsApi, schoolSettingsApi, subjectsApi, teachersApi } from '.'

// 認証オプション付きAPI関数の型定義
type AuthApiFunction<TArgs extends any[], TReturn> = (...args: TArgs) => Promise<TReturn>

// 認証付きAPIクライアント作成
export function useAuthApiClient() {
  const { token, getAuthHeaders } = useAuth()

  // 認証オプション作成
  const createAuthOptions = useCallback(
    (options?: TypeSafeApiOptions): TypeSafeApiOptions => ({
      ...options,
      token: token || undefined,
      headers: {
        ...getAuthHeaders(),
        ...options?.headers,
      },
    }),
    [token, getAuthHeaders]
  )

  // 学校設定API（認証付き）
  const schoolSettings = {
    getSettings: useCallback(
      async (options?: TypeSafeApiOptions) => {
        return schoolSettingsApi.getSettings(createAuthOptions(options))
      },
      [createAuthOptions]
    ),

    updateSettings: useCallback(
      async (
        settings: Parameters<typeof schoolSettingsApi.updateSettings>[0],
        options?: TypeSafeApiOptions
      ) => {
        return schoolSettingsApi.updateSettings(settings, createAuthOptions(options))
      },
      [createAuthOptions]
    ),
  }

  // 教師API（認証付き）
  const teachers = {
    getTeachers: useCallback(
      async (
        params?: Parameters<typeof teachersApi.getTeachers>[0],
        options?: TypeSafeApiOptions
      ) => {
        return teachersApi.getTeachers(params, createAuthOptions(options))
      },
      [createAuthOptions]
    ),

    getTeacher: useCallback(
      async (id: string, options?: TypeSafeApiOptions) => {
        return teachersApi.getTeacher(id, createAuthOptions(options))
      },
      [createAuthOptions]
    ),

    createTeacher: useCallback(
      async (
        teacher: Parameters<typeof teachersApi.createTeacher>[0],
        options?: TypeSafeApiOptions
      ) => {
        return teachersApi.createTeacher(teacher, createAuthOptions(options))
      },
      [createAuthOptions]
    ),

    updateTeacher: useCallback(
      async (
        id: string,
        teacher: Parameters<typeof teachersApi.updateTeacher>[1],
        options?: TypeSafeApiOptions
      ) => {
        return teachersApi.updateTeacher(id, teacher, createAuthOptions(options))
      },
      [createAuthOptions]
    ),

    deleteTeacher: useCallback(
      async (id: string, options?: TypeSafeApiOptions) => {
        return teachersApi.deleteTeacher(id, createAuthOptions(options))
      },
      [createAuthOptions]
    ),
  }

  // 教科API（認証付き）
  const subjects = {
    getSubjects: useCallback(
      async (
        params?: Parameters<typeof subjectsApi.getSubjects>[0],
        options?: TypeSafeApiOptions
      ) => {
        return subjectsApi.getSubjects(params, createAuthOptions(options))
      },
      [createAuthOptions]
    ),

    getSubject: useCallback(
      async (id: string, options?: TypeSafeApiOptions) => {
        return subjectsApi.getSubject(id, createAuthOptions(options))
      },
      [createAuthOptions]
    ),

    createSubject: useCallback(
      async (
        subject: Parameters<typeof subjectsApi.createSubject>[0],
        options?: TypeSafeApiOptions
      ) => {
        return subjectsApi.createSubject(subject, createAuthOptions(options))
      },
      [createAuthOptions]
    ),

    updateSubject: useCallback(
      async (
        id: string,
        subject: Parameters<typeof subjectsApi.updateSubject>[1],
        options?: TypeSafeApiOptions
      ) => {
        return subjectsApi.updateSubject(id, subject, createAuthOptions(options))
      },
      [createAuthOptions]
    ),

    deleteSubject: useCallback(
      async (id: string, options?: TypeSafeApiOptions) => {
        return subjectsApi.deleteSubject(id, createAuthOptions(options))
      },
      [createAuthOptions]
    ),
  }

  // 教室API（認証付き）
  const classrooms = {
    getClassrooms: useCallback(
      async (
        params?: Parameters<typeof classroomsApi.getClassrooms>[0],
        options?: TypeSafeApiOptions
      ) => {
        return classroomsApi.getClassrooms(params, createAuthOptions(options))
      },
      [createAuthOptions]
    ),

    getClassroom: useCallback(
      async (id: string, options?: TypeSafeApiOptions) => {
        return classroomsApi.getClassroom(id, createAuthOptions(options))
      },
      [createAuthOptions]
    ),

    createClassroom: useCallback(
      async (
        classroom: Parameters<typeof classroomsApi.createClassroom>[0],
        options?: TypeSafeApiOptions
      ) => {
        return classroomsApi.createClassroom(classroom, createAuthOptions(options))
      },
      [createAuthOptions]
    ),

    updateClassroom: useCallback(
      async (
        id: string,
        classroom: Parameters<typeof classroomsApi.updateClassroom>[1],
        options?: TypeSafeApiOptions
      ) => {
        return classroomsApi.updateClassroom(id, classroom, createAuthOptions(options))
      },
      [createAuthOptions]
    ),

    deleteClassroom: useCallback(
      async (id: string, options?: TypeSafeApiOptions) => {
        return classroomsApi.deleteClassroom(id, createAuthOptions(options))
      },
      [createAuthOptions]
    ),
  }

  return {
    schoolSettings,
    teachers,
    subjects,
    classrooms,
    // ユーティリティ
    isAuthenticated: !!token,
    hasToken: !!token,
    createAuthOptions,
  }
}
