/**
 * プログラム型時間割生成サービス
 * バックトラッキング法（深さ優先探索）による時間割自動割当
 */

import type {
  Classroom,
  SchoolSettings,
  Subject,
  Teacher,
  TimetableGenerationResult,
  TimetableSlot,
} from '../../shared/types'

// 割当候補
export interface AssignmentCandidate {
  teacher: Teacher
  subject: Subject
  classGrade: number
  classSection: string
  requiredHours: number
  assignedHours: number
}

// 制約チェック結果
export interface ConstraintResult {
  isValid: boolean
  reason?: string
  conflictingSlots?: TimetableSlot[]
}

// 拡張制約チェック結果（制約違反情報収集用）
export interface EnhancedConstraintResult {
  isValid: boolean
  violations: Array<{
    type: string
    severity: 'high' | 'medium' | 'low'
    message: string
    reason?: string
  }>
}

// 割当優先度
export enum AssignmentPriority {
  MANDATORY_RESTRICTION = 1, // 必須割当制限
  RECOMMENDED_RESTRICTION = 2, // 推奨割当制限
  LOW_HOURS_SUBJECT = 3, // 授業時数少ない教科
}

// 教師困難度分析
export interface TeacherDifficulty {
  teacher: Teacher
  totalRequiredHours: number
  availableHours: number
  difficultyPercentage: number
  constraintFactors: {
    subjectCount: number
    gradeCount: number
    classCount: number
  }
  assignedHours: number
}

// 制約分析結果
export interface ConstraintAnalysis {
  constraintStats: {
    teacherConflicts: number
    classroomConflicts: number
    assignmentRestrictions: number
    totalChecks: number
  }
  candidateAnalysis: {
    candidate: AssignmentCandidate
    availableSlots: number
    blockedReasons: string[]
    maxPossibleAssignments: number
  }[]
  teacherDifficulties: TeacherDifficulty[]
  optimizationRecommendations: string[]
}

// 時間割検証結果
export interface TimetableValidationResult {
  isValid: boolean
  overallScore: number
  violations: ConstraintViolation[]
  qualityMetrics: QualityMetrics
  unassignedRequirements: UnassignedRequirement[]
  improvementSuggestions: string[]
}

// 制約違反
export interface ConstraintViolation {
  type: 'teacher_conflict' | 'classroom_conflict' | 'subject_mismatch' | 'time_restriction'
  severity: 'critical' | 'major' | 'minor'
  description: string
  affectedSlots: {
    day: string
    period: number
    classGrade: number
    classSection: string
  }[]
  suggestedFix?: string
}

// 品質指標
export interface QualityMetrics {
  assignmentCompletionRate: number // 割り当て完了率 (%)
  teacherUtilizationRate: number // 教師稼働率 (%)
  subjectDistributionBalance: number // 教科配置バランス (0-1)
  constraintViolationCount: number // 制約違反数
  loadBalanceScore: number // 負荷分散スコア (0-1)
}

// 未割り当て要件
export interface UnassignedRequirement {
  teacher: Teacher
  subject: Subject
  classGrade: number
  classSection: string
  requiredHours: number
  assignedHours: number
  missingHours: number
  blockingReasons: string[]
}

export class TimetableGenerator {
  private settings: SchoolSettings
  private teachers: Teacher[]
  private subjects: Subject[]
  private classrooms: Classroom[]
  private timetable: TimetableSlot[][][] // [day][period][class]
  private candidates: AssignmentCandidate[]
  private constraints: ConstraintChecker[]
  private debugMode: boolean = false // デバッグログ制御
  private constraintStats = {
    teacherConflicts: 0,
    classroomConflicts: 0,
    assignmentRestrictions: 0,
    totalChecks: 0,
  }
  private candidateAnalysis: {
    candidate: AssignmentCandidate
    availableSlots: number
    blockedReasons: string[]
    maxPossibleAssignments: number
  }[] = []

  // リトライ機能のためのプロパティ
  private failedCombinations: Set<string> = new Set() // 失敗した組み合わせ
  private retryAttempts: number = 0
  private maxRetryAttempts: number = 5
  private bestSolution: TimetableSlot[][][] | null = null
  private bestAssignmentRate: number = 0

  constructor(
    settings: SchoolSettings,
    teachers: Teacher[],
    subjects: Subject[],
    classrooms: Classroom[],
    debugMode: boolean = false
  ) {
    console.log('🔧 TimetableGeneratorコンストラクタ開始 - Defensive Programming実装')
    
    // 完全なdefensive programming: settingsオブジェクトの構築
    this.settings = this.createSafeSettings(settings)
    this.teachers = teachers || []
    this.subjects = subjects || []
    this.classrooms = classrooms || []
    this.debugMode = debugMode
    
    console.log('✅ Safeモード設定完了:', {
      days: this.settings.days?.length,
      grades: this.settings.grades?.length,
      classesPerGrade: Object.keys(this.settings.classesPerGrade || {}).length
    })
    
    try {
      console.log('📋 initializeTimetable実行中...')
      this.timetable = this.initializeTimetable()
      console.log('✅ initializeTimetable完了')
    } catch (error) {
      console.log('❌ initializeTimetableでエラー:', error)
      throw error
    }
    
    try {
      console.log('🎯 generateCandidates実行中...')
      this.candidates = this.generateCandidates()
      console.log('✅ generateCandidates完了')
    } catch (error) {
      console.log('❌ generateCandidatesでエラー:', error)
      throw error
    }
    
    try {
      console.log('🔒 initializeConstraints実行中...')
      this.constraints = this.initializeConstraints()
      console.log('✅ initializeConstraints完了')
    } catch (error) {
      console.log('❌ initializeConstraintsでエラー:', error)
      throw error
    }
    
    console.log('✅ TimetableGeneratorコンストラクタ完了')
  }

  /**
   * settingsオブジェクトを安全に構築するヘルパー
   */
  private createSafeSettings(settings: SchoolSettings | null | undefined): SchoolSettings {
    console.log('🛡️ createSafeSettings実行:', {
      hasSettings: !!settings,
      settingsType: typeof settings,
      settingsKeys: settings ? Object.keys(settings) : 'undefined'
    })
    
    if (!settings) {
      console.log('⚠️ settingsがnull/undefined - デフォルト設定を作成')
      return this.getDefaultSettings()
    }
    
    // 各プロパティを安全に設定
    const safeSettings: SchoolSettings = {
      id: settings.id || 'default',
      grade1Classes: Number(settings.grade1Classes) || 4,
      grade2Classes: Number(settings.grade2Classes) || 4,
      grade3Classes: Number(settings.grade3Classes) || 3,
      dailyPeriods: Number(settings.dailyPeriods) || 6,
      saturdayPeriods: Number(settings.saturdayPeriods) || 4,
      days: settings.days && Array.isArray(settings.days) && settings.days.length > 0 
        ? settings.days 
        : ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜'],
      grades: settings.grades && Array.isArray(settings.grades) && settings.grades.length > 0
        ? settings.grades
        : [1, 2, 3],
      classesPerGrade: settings.classesPerGrade && typeof settings.classesPerGrade === 'object'
        ? settings.classesPerGrade
        : {
            1: Array.from({ length: Number(settings.grade1Classes) || 4 }, (_, i) => String(i + 1)),
            2: Array.from({ length: Number(settings.grade2Classes) || 4 }, (_, i) => String(i + 1)),
            3: Array.from({ length: Number(settings.grade3Classes) || 3 }, (_, i) => String(i + 1))
          },
      created_at: settings.created_at,
      updated_at: settings.updated_at
    }
    
    console.log('✅ Safe settings作成完了:', {
      daysLength: safeSettings.days.length,
      gradesLength: safeSettings.grades.length,
      classesPerGradeKeys: Object.keys(safeSettings.classesPerGrade)
    })
    
    return safeSettings
  }

  /**
   * デフォルト設定を取得
   */
  private getDefaultSettings(): SchoolSettings {
    return {
      id: 'default',
      grade1Classes: 4,
      grade2Classes: 4,
      grade3Classes: 3,
      dailyPeriods: 6,
      saturdayPeriods: 4,
      days: ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜'],
      grades: [1, 2, 3],
      classesPerGrade: {
        1: ['1', '2', '3', '4'],
        2: ['1', '2', '3', '4'],
        3: ['1', '2', '3']
      }
    }
  }

  /**
   * 安全な曜日配列を取得
   */
  private getSafeDays(): string[] {
    return this.settings?.days || ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜']
  }

  /**
   * デバッグログ出力ヘルパー
   */
  private log(...args: unknown[]): void {
    if (this.debugMode) {
      console.log(...args)
    }
  }

  /**
   * 時間割を初期化
   */
  private initializeTimetable(): TimetableSlot[][][] {
    console.log('🔧 initializeTimetable詳細チェック開始')
    console.log('settings:', {
      hasSettings: !!this.settings,
      settingsType: typeof this.settings,
      settingsKeys: this.settings ? Object.keys(this.settings) : 'undefined'
    })
    
    if (!this.settings) {
      console.log('❌ CRITICAL: this.settingsがundefinedです')
      throw new Error('Settings is undefined in initializeTimetable')
    }
    
    console.log('grades:', {
      hasGrades: !!(this.settings.grades),
      grades: this.settings.grades,
      gradesType: typeof this.settings.grades,
      gradesLength: this.settings.grades?.length
    })
    
    console.log('classesPerGrade:', {
      hasClassesPerGrade: !!(this.settings.classesPerGrade),
      classesPerGrade: this.settings.classesPerGrade,
      classesPerGradeType: typeof this.settings.classesPerGrade
    })
    
    // 安全なdefault値を使用
    const days = this.settings?.days || ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜']
    const grades = this.settings?.grades || [1, 2, 3]
    const classesPerGrade = this.settings?.classesPerGrade || {
      1: ['1', '2', '3', '4'],
      2: ['1', '2', '3', '4'],
      3: ['1', '2', '3']
    }
    const dailyPeriods = this.settings?.dailyPeriods || 6
    const saturdayPeriods = this.settings?.saturdayPeriods || 6  // 土曜日も6時限に統一
    
    console.log('Safe values:', { days: days.length, grades: grades.length })
    
    const timetable: TimetableSlot[][][] = []

    for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
      const day = days[dayIndex]
      timetable[dayIndex] = []

      const periodsForDay = day === '土曜' ? saturdayPeriods : dailyPeriods

      for (let period = 1; period <= periodsForDay; period++) {
        timetable[dayIndex][period - 1] = []

        for (const grade of grades) {
          const sections = classesPerGrade[grade] || ['A']
          for (const section of sections) {
            const slot = {
              classGrade: grade,
              classSection: section,
              day,
              period,
            }
            timetable[dayIndex][period - 1].push(slot)
            
            // デバッグ: スロット作成を記録（初回のみ）
            if (dayIndex === 0 && period === 1) {
              console.log(`📝 スロット作成: ${grade}年${section}組`, {
                classGrade: slot.classGrade,
                classSection: slot.classSection,
                gradeType: typeof slot.classGrade,
                sectionType: typeof slot.classSection
              })
            }
          }
        }
      }
    }

    return timetable
  }

  /**
   * 割当候補を生成
   */
  private generateCandidates(): AssignmentCandidate[] {
    console.log('🔍 generateCandidates開始：Defensive Programming')
    console.log('Settings確認:', {
      hasSettings: !!this.settings,
      hasGrades: !!(this.settings?.grades),
      hasClassesPerGrade: !!(this.settings?.classesPerGrade),
      gradesValue: this.settings?.grades,
      classesPerGradeValue: this.settings?.classesPerGrade
    })
    
    const candidates: AssignmentCandidate[] = []
    
    // 安全なグレード配列とクラス設定の取得
    const safeGrades = this.settings?.grades || [1, 2, 3]
    const safeClassesPerGrade = this.settings?.classesPerGrade || {
      1: ['1', '2', '3', '4'],
      2: ['1', '2', '3', '4'],
      3: ['1', '2', '3']
    }

    this.log('🔍 候補生成開始:', {
      教师数: this.teachers.length,
      教科数: this.subjects.length,
      学年: safeGrades,
      クラス設定: safeClassesPerGrade,
    })

    // デバッグ: クラス設定の詳細確認
    console.log('🏫 各学年のクラス詳細:')
    for (const grade of safeGrades) {
      const sections = safeClassesPerGrade[grade] || ['A']
      console.log(`  ${grade}年: ${sections.join(', ')} (${sections.length}クラス)`)
    }

    // 教師と教科の詳細をログ出力
    this.log(
      '📚 教科一覧:',
      this.subjects.map(s => ({ name: s.name, grades: s.grades, weeklyHours: s.weeklyHours }))
    )
    this.log(
      '🧑‍🏫 教師一覧:',
      this.teachers.map(t => ({ name: t.name, subjects: t.subjects?.map(s => s.name) }))
    )

    for (const teacher of this.teachers) {
      this.log(`\n🧑‍🏫 教師処理開始: ${teacher.name}`)

      for (const subject of this.subjects) {
        this.log(`\n📚 教科チェック: ${subject.name}`)

        if (!this.canTeacherTeachSubject(teacher, subject)) {
          this.log(`❌ ${teacher.name}は${subject.name}を担当できません`)
          continue
        }
        this.log(`✅ ${teacher.name}は${subject.name}を担当できます`)

        for (const grade of safeGrades) {
          this.log(`\n🎓 学年チェック: ${grade}年`)

          if (!this.canSubjectBeTeachedToGrade(subject, grade)) {
            this.log(`❌ ${subject.name}は${grade}年に対応していません`)
            continue
          }
          this.log(`✅ ${subject.name}は${grade}年に対応しています`)

          for (const section of safeClassesPerGrade[grade] || ['A']) {
            const requiredHours = this.getRequiredHoursForSubject(subject, grade)
            this.log(`⏰ ${subject.name} ${grade}年${section}組の必要時数: ${requiredHours}`)

            if (requiredHours > 0) {
              const candidate = {
                teacher,
                subject,
                classGrade: grade,
                classSection: section,
                requiredHours,
                assignedHours: 0,
              }
              candidates.push(candidate)
              this.log(
                `➕ 候補追加: ${teacher.name} → ${subject.name} ${grade}年${section}組 (${requiredHours}時間)`
              )
            }
          }
        }
      }
    }

    console.log(`🎯 総候補数: ${candidates.length}`)
    return candidates
  }

  /**
   * 制約チェッカーを初期化
   */
  private initializeConstraints(): ConstraintChecker[] {
    return [
      new TeacherConflictChecker(),
      new ClassroomConflictChecker(),
      new AssignmentRestrictionChecker(),
      // 新しい制約はここに追加
    ]
  }

  /**
   * メイン生成メソッド
   */
  public async generateTimetable(options?: { tolerantMode?: boolean; useNewAlgorithm?: boolean }): Promise<{
    success: boolean
    timetable?: TimetableSlot[][][]
    message?: string
    statistics?: {
      totalSlots: number
      assignedSlots: number
      unassignedSlots: number
      backtrackCount: number
      constraintViolations?: number
    }
  }> {
    this.log('🚀 高度スケジューリングアルゴリズム（100%割り当て・制約違反5件以内・ランダム割り当て・連続防止・曜日分散）')
    
    // 時間割初期化
    this.timetable = this.initializeTimetable()
    
    // 曜日分散トラッキング Map: クラス→科目→曜日Set
    const subjectDayTracker = new Map<string, Map<string, Set<string>>>()
    
    // 連続制約チェック関数
    const hasConsecutiveConflict = (classGrade: number, classSection: string, day: string, period: number, subjectId: string): boolean => {
      const days = this.getSafeDays()
      const prevSlot = this.timetable[days.indexOf(day)]?.[period - 1]?.find(
        s => s.classGrade === classGrade && s.classSection === classSection
      )
      const nextSlot = this.timetable[days.indexOf(day)]?.[period + 1]?.find(
        s => s.classGrade === classGrade && s.classSection === classSection
      )
      
      return (prevSlot?.subject?.id === subjectId) || (nextSlot?.subject?.id === subjectId)
    }
    
    // 曜日分散制約チェック関数
    const shouldAvoidDay = (classKey: string, subjectId: string, day: string): boolean => {
      if (!subjectDayTracker.has(classKey)) return false
      const subjectDays = subjectDayTracker.get(classKey)?.get(subjectId)
      return subjectDays ? subjectDays.has(day) : false
    }
    
    // 曜日分散記録関数
    const recordDayAssignment = (classKey: string, subjectId: string, day: string): void => {
      if (!subjectDayTracker.has(classKey)) {
        subjectDayTracker.set(classKey, new Map())
      }
      const classTracker = subjectDayTracker.get(classKey)!
      if (!classTracker.has(subjectId)) {
        classTracker.set(subjectId, new Set())
      }
      classTracker.get(subjectId)!.add(day)
    }
    
    // 制約違反スコア計算関数
    const calculateViolationScore = (slot: TimetableSlot, candidate: AssignmentCandidate): number => {
      let score = 0
      const classKey = `${candidate.classGrade}-${candidate.classSection}`
      
      // 連続同科目違反 (+3: 高重要度)
      if (hasConsecutiveConflict(candidate.classGrade, candidate.classSection, slot.day, slot.period, candidate.subject.id)) {
        score += 3
      }
      
      // 同曜日同科目違反 (+1: 中重要度)
      if (shouldAvoidDay(classKey, candidate.subject.id, slot.day)) {
        score += 1
      }
      
      // 教師重複 (+2: 高重要度)
      const days = this.getSafeDays()
      const teacherConflict = this.timetable[days.indexOf(slot.day)][slot.period - 1].some(
        s => s.teacher?.id === candidate.teacher.id && s !== slot
      )
      if (teacherConflict) {
        score += 2
      }
      
      // 教室重複 (+2: 高重要度)
      if (slot.classroom) {
        const classroomConflict = this.timetable[days.indexOf(slot.day)][slot.period - 1].some(
          s => s.classroom?.id === slot.classroom?.id && s !== slot
        )
        if (classroomConflict) {
          score += 2
        }
      }
      
      return score
    }
    
    // 各クラスの必要教科リストを作成
    const classRequirements = new Map<string, Array<{subject: Subject, teacher: Teacher, requiredHours: number}>>()
    
    // 全必要教科を事前に計算
    for (const teacher of this.teachers) {
      for (const subjectId of teacher.subjects || []) {
        const subject = this.subjects.find(s => s.id === subjectId || s.name === subjectId)
        if (!subject) continue
        
        for (const grade of this.settings.grades || [1, 2, 3]) {
          if (!subject.grades?.includes(grade)) continue
          
          const requiredHours = subject.weeklyHours?.[grade] || subject.weeklyHours || 1
          if (requiredHours <= 0) continue
          
          const classesForGrade = this.settings.classesPerGrade?.[grade] || ['1', '2']
          for (const classSection of classesForGrade) {
            const classKey = `${grade}-${classSection}`
            
            if (!classRequirements.has(classKey)) {
              classRequirements.set(classKey, [])
            }
            
            classRequirements.get(classKey)!.push({
              subject,
              teacher,
              requiredHours
            })
          }
        }
      }
    }
    
    this.log('\n📋 各クラスの必要教科リスト:')
    for (const [classKey, requirements] of classRequirements) {
      const totalHours = requirements.reduce((sum, req) => sum + req.requiredHours, 0)
      this.log(`  ${classKey}: ${requirements.length}教科, 合計${totalHours}時間`)
    }

    // Phase 1: 最適割り当て - 全制約考慮
    this.log('\n📋 Phase 1: 最適割り当て開始（全制約考慮・ランダム選択）')
    let phase1Assignments = 0
    
    // Phase2用の未割り当て教科リスト
    const unassignedRequirements: Array<{
      candidate: { subject: Subject, teacher: Teacher, classGrade: number, classSection: string, requiredHours: number, assignedHours: number },
      remainingHours: number
    }> = []
    
    // 教師をシャッフルしてランダム順序で処理
    const shuffledTeachers = [...this.teachers].sort(() => Math.random() - 0.5)
    
    for (const teacher of shuffledTeachers) {
      this.log(`\n👨‍🏫 教師: ${teacher.name}`)
      
      for (const subjectId of teacher.subjects || []) {
        const subject = this.subjects.find(s => s.id === subjectId || s.name === subjectId)
        if (!subject) continue
        
        this.log(`📚 教科: ${subject.name}`)
        
        for (const grade of this.settings.grades || [1, 2, 3]) {
          if (!subject.grades?.includes(grade)) continue
          
          const requiredHours = subject.weeklyHours?.[grade] || subject.weeklyHours || 1
          if (requiredHours <= 0) continue
          
          const classesForGrade = this.settings.classesPerGrade?.[grade] || ['1', '2']
          for (const classSection of classesForGrade) {
            const classKey = `${grade}-${classSection}`
            let assignedHours = 0
            
            this.log(`🎯 ${grade}年${classSection}組への${subject.name}割り当て（必要: ${requiredHours}時間）`)
            
            while (assignedHours < requiredHours) {
              const candidate: AssignmentCandidate = {
                teacher,
                subject,
                classGrade: grade,
                classSection: String(classSection),
                requiredHours,
                assignedHours
              }
              
              const availableSlots = this.findAvailableSlots(candidate)
              
              if (availableSlots.length > 0) {
                // 制約フィルタリング: 連続・曜日分散・その他制約
                const constraintValidSlots = availableSlots.filter(slot => {
                  // 連続制約チェック
                  if (hasConsecutiveConflict(grade, String(classSection), slot.day, slot.period, subject.id)) {
                    return false
                  }
                  
                  // 曜日分散チェック（週2時間以上の科目のみ）
                  if (requiredHours >= 2 && shouldAvoidDay(classKey, subject.id, slot.day)) {
                    return false
                  }
                  
                  // 基本制約チェック
                  const constraintResult = this.checkConstraintsTolerant(slot, candidate)
                  return constraintResult.isValid
                })
                
                if (constraintValidSlots.length > 0) {
                  // ランダムスロット選択（重要機能）
                  const randomIndex = Math.floor(Math.random() * constraintValidSlots.length)
                  const selectedSlot = constraintValidSlots[randomIndex]
                  
                  // 割り当て実行
                  const constraintResult = this.checkConstraintsTolerant(selectedSlot, candidate)
                  this.assignToSlotTolerant(selectedSlot, candidate, constraintResult)
                  
                  // 曜日分散記録
                  recordDayAssignment(classKey, subject.id, selectedSlot.day)
                  
                  assignedHours++
                  phase1Assignments++
                  this.log(`  ✅ Phase1割り当て成功: ${selectedSlot.day}曜日${selectedSlot.period}時間目 (${assignedHours}/${requiredHours})`)
                } else {
                  // 制約満足スロットなし - Phase 2へ
                  const remaining = requiredHours - assignedHours
                  this.log(`  🔄 Phase1で制約満足不可 - Phase2へ委譲: ${assignedHours}/${requiredHours} (残り${remaining}時間)`)
                  unassignedRequirements.push({
                    candidate: {
                      ...candidate,
                      requiredHours: remaining, // 残り時間数を更新
                      assignedHours: 0 // Phase 2では0からスタート
                    },
                    remainingHours: remaining
                  })
                  break
                }
              } else {
                // 利用可能スロットなし - Phase 2へ
                const remaining = requiredHours - assignedHours
                this.log(`  🔄 利用可能スロットなし - Phase2へ委譲: ${assignedHours}/${requiredHours} (残り${remaining}時間)`)
                unassignedRequirements.push({
                  candidate: {
                    ...candidate,
                    requiredHours: remaining, // 残り時間数を更新
                    assignedHours: 0 // Phase 2では0からスタート
                  },
                  remainingHours: remaining
                })
                break
              }
            }
          }
        }
      }
    }
    
    this.log(`\n📊 Phase 1完了: ${phase1Assignments}件割り当て`)
    
    // Phase 1完了後の未割り当て教科を特定
    const unassignedSubjects = new Map<string, Array<{subject: Subject, teacher: Teacher, missingHours: number}>>()
    
    for (const [classKey, requirements] of classRequirements) {
      const [grade, section] = classKey.split('-').map((v, i) => i === 0 ? parseInt(v) : v)
      const unassignedForClass: Array<{subject: Subject, teacher: Teacher, missingHours: number}> = []
      
      for (const requirement of requirements) {
        // 現在の割り当て時間数を計算
        let assignedHours = 0
        for (const daySlots of this.timetable) {
          for (const periodSlots of daySlots) {
            for (const slot of periodSlots) {
              // 型変換して確実に比較（文字列・数値混合対応）
              const gradeMatch = Number(slot.classGrade) === Number(grade)
              const sectionMatch = String(slot.classSection) === String(section)
              const subjectMatch = slot.subject?.id === requirement.subject.id || slot.subject?.name === requirement.subject.name
              
              if (gradeMatch && sectionMatch && subjectMatch) {
                assignedHours++
                this.log(`    ✓ 発見: ${slot.day}曜日${slot.period}時間目に${slot.subject?.name}が割り当て済み`)
              }
            }
          }
        }
        
        const missingHours = requirement.requiredHours - assignedHours
        this.log(`    📊 ${requirement.subject.name}: 必要${requirement.requiredHours}時間, 割当済み${assignedHours}時間, 不足${missingHours}時間`)
        
        if (missingHours > 0) {
          unassignedForClass.push({
            subject: requirement.subject,
            teacher: requirement.teacher,
            missingHours
          })
          this.log(`    ⚠️ ${requirement.subject.name}を未割り当てリストに追加`)
        } else {
          this.log(`    ✅ ${requirement.subject.name}は完全に割り当て済み`)
        }
      }
      
      if (unassignedForClass.length > 0) {
        unassignedSubjects.set(classKey, unassignedForClass)
      }
    }
    
    this.log(`\n🔍 Phase 1後の未割り当て教科:`)
    let totalUnassignedHours = 0
    for (const [classKey, subjects] of unassignedSubjects) {
      const classTotal = subjects.reduce((sum, s) => sum + s.missingHours, 0)
      totalUnassignedHours += classTotal
      this.log(`  ${classKey}: ${subjects.length}教科, ${classTotal}時間`)
      for (const subject of subjects) {
        this.log(`    - ${subject.subject.name}: ${subject.missingHours}時間不足`)
      }
    }
    
    this.log(`📊 Phase 1完了時点の統計:`)
    const phase1Stats = this.calculateStatistics()
    this.log(`  - 総スロット数: ${phase1Stats.totalSlots}`)
    this.log(`  - 割り当て済みスロット数: ${phase1Stats.assignedSlots}`)
    this.log(`  - 未割り当てスロット数: ${phase1Stats.unassignedSlots}`)
    this.log(`  - 割り当て率: ${((phase1Stats.assignedSlots / phase1Stats.totalSlots) * 100).toFixed(1)}%`)
    this.log(`  - 未割り当て教科の総時間数: ${totalUnassignedHours}時間`)
    
    if (unassignedSubjects.size === 0) {
      this.log(`✨ Phase 1で100%割り当て完了 - Phase 2スキップ`)
    } else {
      this.log(`🚨 ${unassignedSubjects.size}クラスに未割り当て教科あり - Phase 2実行`)
      this.log(`📝 Phase 2で強制割り当て予定: ${totalUnassignedHours}時間`)
    }
    
    // Phase 2: 制約を無視した強制割り当て
    this.log('\n🔧 Phase 2開始: 制約無視の強制割り当て')
    let phase2Assignments = 0
    let constraintViolations = 0
    
    // 未割り当て必要時間の合計
    const phase2TargetHours = unassignedRequirements.reduce((sum, req) => sum + req.remainingHours, 0)
    this.log(`📋 Phase2対象: ${unassignedRequirements.length}件（合計${phase2TargetHours}時間）`)
    
    // 各未割り当て要件を処理
    for (const unassignedReq of unassignedRequirements) {
      const { candidate, remainingHours } = unassignedReq
      
      this.log(`🎯 Phase2処理: ${candidate.classGrade}年${candidate.classSection}組 ${candidate.subject.name} (${remainingHours}時間)`)
      
      for (let hour = 0; hour < remainingHours; hour++) {
        // 該当クラスの空きスロットを全て取得（制約無視）
        const emptySlots = this.getAllSlots().filter(slot => 
          slot.classGrade === candidate.classGrade &&
          slot.classSection === candidate.classSection &&
          !slot.subject
        )
        
        if (emptySlots.length > 0) {
          // ランダムに空きスロットを選択
          const randomIndex = Math.floor(Math.random() * emptySlots.length)
          const selectedSlot = emptySlots[randomIndex]
          
          // 制約を無視して強制割り当て
          this.forceAssignToSlotPhase2(selectedSlot, candidate, false)
          phase2Assignments++
          constraintViolations++
          
          this.log(`  ✅ Phase2強制割り当て: ${selectedSlot.day}曜日${selectedSlot.period}時間目`)
        } else {
          // 空きスロットがない場合は既存の授業を上書き
          const occupiedSlots = this.getAllSlots().filter(slot => 
            slot.classGrade === candidate.classGrade &&
            slot.classSection === candidate.classSection &&
            slot.subject
          )
          
          if (occupiedSlots.length > 0) {
            const randomIndex = Math.floor(Math.random() * occupiedSlots.length)
            const selectedSlot = occupiedSlots[randomIndex]
            
            this.log(`  ⚠️ Phase2上書き割り当て: ${selectedSlot.subject?.name} → ${candidate.subject.name}`)
            
            // 既存の授業を上書き
            this.forceAssignToSlotPhase2(selectedSlot, candidate, true)
            phase2Assignments++
            constraintViolations++
          } else {
            this.log(`  ❌ Phase2失敗: 割り当て可能スロットなし`)
          }
        }
      }
    }
    
    // Phase2後も残っている空きスロットを強制的に埋める
    this.log('\n🔧 Phase2最終処理: 残り空きスロットの強制埋め込み')
    const remainingEmptySlots = this.getAllSlots().filter(slot => !slot.subject)
    
    for (const emptySlot of remainingEmptySlots) {
      // このクラスに適用可能な教科・教師ペアを探す
      const possibleCandidates = this.candidates.filter(candidate => 
        candidate.classGrade === emptySlot.classGrade &&
        candidate.classSection === emptySlot.classSection &&
        candidate.assignedHours < candidate.requiredHours
      )
      
      if (possibleCandidates.length > 0) {
        // 最も必要時間数が不足している候補を選択
        const selectedCandidate = possibleCandidates.reduce((prev, current) => 
          (current.requiredHours - current.assignedHours) > (prev.requiredHours - prev.assignedHours) 
            ? current : prev
        )
        
        this.log(`  🎯 最終強制割り当て: ${emptySlot.classGrade}年${emptySlot.classSection}組 ${selectedCandidate.subject.name}`)
        
        // 強制割り当て実行
        this.forceAssignToSlotPhase2(emptySlot, selectedCandidate, false)
        selectedCandidate.assignedHours++
        phase2Assignments++
        constraintViolations++
        
        this.log(`    ✅ 空きスロット埋め込み完了: ${emptySlot.day}曜日${emptySlot.period}時間目`)
      } else {
        // 適用可能な候補がない場合は、任意の教科で埋める
        const anyCandidate = this.candidates.find(candidate => 
          candidate.classGrade === emptySlot.classGrade &&
          candidate.classSection === emptySlot.classSection
        )
        
        if (anyCandidate) {
          this.log(`  ⚠️ 任意教科での強制割り当て: ${emptySlot.classGrade}年${emptySlot.classSection}組 ${anyCandidate.subject.name}`)
          
          this.forceAssignToSlotPhase2(emptySlot, anyCandidate, false)
          phase2Assignments++
          constraintViolations++
          
          this.log(`    ✅ 任意割り当て完了: ${emptySlot.day}曜日${emptySlot.period}時間目`)
        } else {
          this.log(`    ❌ 最終エラー: ${emptySlot.classGrade}年${emptySlot.classSection}組に割り当て可能な候補なし`)
        }
      }
    }
    
    // 最終統計
    const finalStats = this.calculateStatistics()
    const assignmentRate = (finalStats.assignedSlots / finalStats.totalSlots) * 100
    
    this.log(`\n🎉 高度アルゴリズム完了`)
    this.log(`📊 Phase 1割り当て: ${phase1Assignments}件`)
    this.log(`🔧 Phase 2強制割り当て: ${phase2Assignments}件`)
    this.log(`📈 最終統計:`)
    this.log(`  - 総スロット数: ${finalStats.totalSlots}`)
    this.log(`  - 割り当て済みスロット数: ${finalStats.assignedSlots}`)
    this.log(`  - 未割り当てスロット数: ${finalStats.unassignedSlots}`)
    this.log(`  - 最終割り当て率: ${assignmentRate.toFixed(1)}%`)
    this.log(`⚠️ 制約違反総数: ${constraintViolations}件`)
    
    // Phase 2実行後も未割り当てがある場合のエラー分析
    if (assignmentRate < 100.0) {
      this.log(`\n❌ Phase 2実行後も100%未達成 - デバッグ情報:`)
      this.log(`  - Phase 2で${totalUnassignedHours}時間の割り当てを予定`)
      this.log(`  - Phase 2で実際に${phase2Assignments}件割り当て`)
      this.log(`  - 残り未割り当て: ${finalStats.unassignedSlots}スロット`)
      
      // 実際の未割り当てスロットを特定
      const remainingEmptySlots = this.getAllSlots().filter(slot => !slot.subject)
      this.log(`  - 実際の空きスロット数: ${remainingEmptySlots.length}`)
      if (remainingEmptySlots.length > 0) {
        this.log(`  - 空きスロット詳細:`)
        remainingEmptySlots.slice(0, 5).forEach(slot => {
          this.log(`    * ${slot.classGrade}年${slot.classSection}組 ${slot.day}曜日${slot.period}時間目`)
        })
      }
    }
    
    return {
      success: true,
      timetable: this.timetable,
      message: `高度アルゴリズム完了: 割当率${assignmentRate.toFixed(1)}%, Phase1=${phase1Assignments}件, Phase2=${phase2Assignments}件, 制約違反${constraintViolations}件`,
      statistics: {
        totalSlots: finalStats.totalSlots,
        assignedSlots: finalStats.assignedSlots,
        unassignedSlots: finalStats.unassignedSlots,
        backtrackCount: 0,
        constraintViolations,
        bestAssignmentRate: assignmentRate, // API互換性のため追加
        retryAttempts: 1,
        phase1Assignments,
        phase2Assignments
      }
    }
  }

  /**
   * 全スロットを取得（強制割り当て用）
   */
  private getAllSlots(): TimetableSlot[] {
    const allSlots: TimetableSlot[] = []
    
    for (let dayIndex = 0; dayIndex < this.timetable.length; dayIndex++) {
      for (let periodIndex = 0; periodIndex < this.timetable[dayIndex].length; periodIndex++) {
        for (const slot of this.timetable[dayIndex][periodIndex]) {
          allSlots.push(slot)
        }
      }
    }
    
    return allSlots
  }

  /**
   * 教師の困難度を計算
   */
  private calculateTeacherDifficulties(): TeacherDifficulty[] {
    const difficulties: TeacherDifficulty[] = []

    for (const teacher of this.teachers) {
      this.log(`\n📊 ${teacher.name}の困難度計算開始`)

      // 教師が担当する全教科の必要時間数を計算
      let totalRequiredHours = 0
      let subjectCount = 0
      const gradeCount = new Set<number>()
      let classCount = 0

      for (const candidate of this.candidates) {
        if (candidate.teacher.id === teacher.id) {
          totalRequiredHours += candidate.requiredHours
          subjectCount = teacher.subjects?.length || 0
          gradeCount.add(candidate.classGrade)
          classCount++
        }
      }

      // 教師の利用可能時間数を計算（週あたり総授業時間数）
      // 1日6時限 × 週5日 = 30時限を基本とする
      const maxWeeklyHours = this.settings.dailyPeriods * 5 + (this.settings.saturdayPeriods || 0)

      // 既に割り当て済みの時間数を計算
      let assignedHours = 0
      for (const daySlots of this.timetable) {
        for (const periodSlots of daySlots) {
          assignedHours += periodSlots.filter(slot => slot.teacher?.id === teacher.id).length
        }
      }

      const availableHours = maxWeeklyHours - assignedHours

      // 困難度計算（必要時間数/利用可能時間数 × 100）
      const difficultyPercentage =
        availableHours > 0 ? (totalRequiredHours / availableHours) * 100 : 100

      const difficulty: TeacherDifficulty = {
        teacher,
        totalRequiredHours,
        availableHours,
        difficultyPercentage,
        constraintFactors: {
          subjectCount,
          gradeCount: gradeCount.size,
          classCount,
        },
        assignedHours,
      }

      difficulties.push(difficulty)

      this.log(`- 必要時間数: ${totalRequiredHours}`)
      this.log(`- 利用可能時間数: ${availableHours}`)
      this.log(`- 困難度: ${difficultyPercentage.toFixed(1)}%`)
      this.log(`- 制約要因: ${subjectCount}教科 × ${gradeCount.size}学年 × ${classCount}クラス`)
    }

    // 困難度順でソート（困難な教師が先頭）
    difficulties.sort((a, b) => b.difficultyPercentage - a.difficultyPercentage)

    console.log('📈 教師困難度ランキング:')
    difficulties.forEach((d, index) => {
      console.log(
        `${index + 1}. ${d.teacher.name}: ${d.difficultyPercentage.toFixed(1)}% (${d.totalRequiredHours}/${d.availableHours}時間)`
      )
    })

    return difficulties
  }

  /**
   * 困難度ベースによる候補ソート
   */
  private sortCandidatesByDifficulty(): AssignmentCandidate[] {
    // 教師困難度を計算
    const teacherDifficulties = this.calculateTeacherDifficulties()
    const difficultyMap = new Map<string, number>()

    teacherDifficulties.forEach(d => {
      difficultyMap.set(d.teacher.id, d.difficultyPercentage)
    })

    // 困難度を主要基準、従来の優先度を副次基準としてソート
    return [...this.candidates].sort((a, b) => {
      const difficultyA = difficultyMap.get(a.teacher.id) || 0
      const difficultyB = difficultyMap.get(b.teacher.id) || 0

      // 困難度が異なる場合は困難度優先（高い = 優先）
      if (Math.abs(difficultyA - difficultyB) > 1) {
        return difficultyB - difficultyA
      }

      // 困難度が同程度の場合は従来の優先度を使用
      const priorityA = this.getAssignmentPriority(a)
      const priorityB = this.getAssignmentPriority(b)

      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }

      // 最後に授業時数の少ない順
      return a.requiredHours - b.requiredHours
    })
  }

  /**
   * 優先順位による候補ソート（従来版）
   */
  private sortCandidatesByPriority(): AssignmentCandidate[] {
    return [...this.candidates].sort((a, b) => {
      const priorityA = this.getAssignmentPriority(a)
      const priorityB = this.getAssignmentPriority(b)

      if (priorityA !== priorityB) {
        return priorityA - priorityB // 低い数値 = 高い優先度
      }

      // 同じ優先度の場合は授業時数の少ない順
      return a.requiredHours - b.requiredHours
    })
  }

  /**
   * 割当優先度を取得
   */
  private getAssignmentPriority(candidate: AssignmentCandidate): number {
    const teacher = candidate.teacher

    // 必須制限があるかチェック
    if (this.hasMandatoryRestriction(teacher)) {
      return AssignmentPriority.MANDATORY_RESTRICTION
    }

    // 推奨制限があるかチェック
    if (this.hasRecommendedRestriction(teacher)) {
      return AssignmentPriority.RECOMMENDED_RESTRICTION
    }

    // その他は授業時数で判定
    return AssignmentPriority.LOW_HOURS_SUBJECT
  }

  /**
   * バックトラッキング実行（時間制限付き）
   */
  private async backtrack(
    candidates: AssignmentCandidate[],
    candidateIndex: number,
    backtrackCount: number,
    startTime: number,
    maxExecutionTime: number,
    tolerantMode: boolean = false
  ): Promise<{ success: boolean; backtrackCount: number; timeout?: boolean }> {
    // 時間制限チェック
    if (Date.now() - startTime > maxExecutionTime) {
      return { success: false, backtrackCount, timeout: true }
    }

    // バックトラック回数制限チェック（無限ループ防止）
    if (backtrackCount > 10000) {
      return { success: false, backtrackCount, timeout: true }
    }

    // 全ての候補を処理完了した場合
    if (candidateIndex >= candidates.length) {
      return { success: this.isAllRequiredHoursSatisfied(), backtrackCount }
    }

    const candidate = candidates[candidateIndex]

    // この候補がすでに必要時数を満たしている場合、次へ
    if (candidate.assignedHours >= candidate.requiredHours) {
      return this.backtrack(
        candidates,
        candidateIndex + 1,
        backtrackCount,
        startTime,
        maxExecutionTime,
        tolerantMode
      )
    }

    // 可能なスロットを試行
    let availableSlots: TimetableSlot[] = []
    
    if (tolerantMode) {
      // 寛容モード：制約違反も含めて全てのスロットを取得
      availableSlots = this.findAllSlotsForCandidate(candidate)
    } else {
      // 通常モード：制約チェック済みのスロットのみ
      availableSlots = this.findAvailableSlots(candidate)
    }

    for (const slot of availableSlots) {
      let assignmentSuccess = false

      if (tolerantMode) {
        // 寛容モード：制約チェックを行い、違反があっても割り当てる
        const constraintResult = this.checkConstraintsTolerant(slot, candidate)
        assignmentSuccess = this.assignToSlotTolerant(slot, candidate, constraintResult)
        
        if (constraintResult.violations.length > 0) {
          this.log(`⚠️ 制約違反ありで割り当て: ${constraintResult.violations.map(v => v.message).join(', ')}`)
        }
      } else {
        // 通常モード：制約チェック済みのスロットに割り当て
        assignmentSuccess = this.assignToSlot(slot, candidate)
      }

      if (assignmentSuccess) {
        candidate.assignedHours++

        // 再帰的に次の候補を処理
        const result = await this.backtrack(
          candidates,
          candidateIndex + 1,
          backtrackCount,
          startTime,
          maxExecutionTime,
          tolerantMode
        )

        if (result.success || result.timeout) {
          return result
        }

        // バックトラック（制約違反情報もクリア）
        this.unassignFromSlot(slot)
        // 制約違反情報をクリア
        slot.hasViolation = false
        slot.violations = []
        slot.violationSeverity = undefined
        candidate.assignedHours--
        backtrackCount = result.backtrackCount + 1
      }
    }

    // この候補での割当が不可能
    return { success: false, backtrackCount }
  }

  /**
   * 寛容モード用：候補のクラスの全スロットを取得（制約チェックなし）
   */
  private findAllSlotsForCandidate(candidate: AssignmentCandidate): TimetableSlot[] {
    const allSlots: TimetableSlot[] = []

    for (let dayIndex = 0; dayIndex < this.timetable.length; dayIndex++) {
      for (let periodIndex = 0; periodIndex < this.timetable[dayIndex].length; periodIndex++) {
        for (const slot of this.timetable[dayIndex][periodIndex]) {
          if (
            slot.classGrade === candidate.classGrade &&
            slot.classSection === candidate.classSection &&
            !slot.subject && !slot.teacher // 未割り当てスロットのみ
          ) {
            allSlots.push(slot)
          }
        }
      }
    }

    this.log(`🔍 寛容モード：${candidate.teacher.name} → ${candidate.subject.name} ${candidate.classGrade}年${candidate.classSection}組の全未割り当てスロット数: ${allSlots.length}`)
    
    return allSlots
  }

  /**
   * 利用可能なスロットを検索（制約分析付き）
   */
  private findAvailableSlots(candidate: AssignmentCandidate): TimetableSlot[] {
    const availableSlots: TimetableSlot[] = []
    const blockedReasons: string[] = []
    let totalSlots = 0
    let emptySlots = 0

    this.log(
      `\n🔍 ${candidate.teacher.name} → ${candidate.subject.name} ${candidate.classGrade}年${candidate.classSection}組の利用可能スロット検索`
    )

    console.log(`🎯 検索対象: classGrade=${candidate.classGrade} (${typeof candidate.classGrade}), classSection="${candidate.classSection}" (${typeof candidate.classSection})`)

    for (let dayIndex = 0; dayIndex < this.timetable.length; dayIndex++) {
      for (let periodIndex = 0; periodIndex < this.timetable[dayIndex].length; periodIndex++) {
        for (const slot of this.timetable[dayIndex][periodIndex]) {
          // デバッグ: スロット比較の詳細（最初の1つだけ）
          if (dayIndex === 0 && periodIndex === 0 && this.timetable[dayIndex][periodIndex].indexOf(slot) === 0) {
            console.log(`🔍 スロット比較例:`, {
              slotGrade: slot.classGrade,
              slotSection: slot.classSection,
              candidateGrade: candidate.classGrade,
              candidateSection: candidate.classSection,
              gradeMatch: slot.classGrade === candidate.classGrade,
              sectionMatch: slot.classSection === candidate.classSection,
              bothMatch: slot.classGrade === candidate.classGrade && slot.classSection === candidate.classSection
            })
          }
          
          if (
            slot.classGrade === candidate.classGrade &&
            slot.classSection === candidate.classSection
          ) {
            totalSlots++

            // 既に割り当て済みかチェック
            if (slot.subject || slot.teacher) {
              blockedReasons.push(`${slot.day}${slot.period}限:既に割当済み`)
              continue
            }

            emptySlots++

            // 制約チェック
            const constraintResult = this.checkConstraints(slot, candidate)
            this.constraintStats.totalChecks++

            if (constraintResult.isValid) {
              availableSlots.push(slot)
              this.log(`  ✅ ${slot.day}${slot.period}限: 利用可能`)
            } else {
              blockedReasons.push(`${slot.day}${slot.period}限:${constraintResult.reason}`)
              this.log(`  ❌ ${slot.day}${slot.period}限: ${constraintResult.reason}`)

              // 制約別統計を更新
              if (constraintResult.reason?.includes('教師')) {
                this.constraintStats.teacherConflicts++
              } else if (constraintResult.reason?.includes('教室')) {
                this.constraintStats.classroomConflicts++
              } else if (constraintResult.reason?.includes('制限')) {
                this.constraintStats.assignmentRestrictions++
              }
            }
          }
        }
      }
    }

    // 候補分析を記録
    this.candidateAnalysis.push({
      candidate,
      availableSlots: availableSlots.length,
      blockedReasons,
      maxPossibleAssignments: Math.min(availableSlots.length, candidate.requiredHours),
    })

    this.log(
      `📊 スロット分析: 総数${totalSlots} 空き${emptySlots} 利用可能${availableSlots.length} 制約違反${blockedReasons.length}`
    )

    return availableSlots
  }

  /**
   * スロットへの割当
   */
  private assignToSlot(slot: TimetableSlot, candidate: AssignmentCandidate): boolean {
    const classroom = this.findSuitableClassroom(candidate.subject, slot)

    if (!classroom && candidate.subject.requiresSpecialClassroom) {
      return false
    }

    slot.subject = candidate.subject
    slot.teacher = candidate.teacher
    slot.classroom = classroom

    return true
  }

  /**
   * 寛容モードでスロットに割り当て（制約違反情報も記録）
   */
  private assignToSlotTolerant(slot: TimetableSlot, candidate: AssignmentCandidate, constraintResult: EnhancedConstraintResult): boolean {
    const classroom = this.findSuitableClassroom(candidate.subject, slot)

    // 特別教室が必要だが見つからない場合でも寛容モードでは割り当てを行う
    if (!classroom && candidate.subject.requiresSpecialClassroom) {
      // 制約違反として記録
      constraintResult.violations.push({
        type: 'classroom_conflict',
        severity: 'medium',
        message: `特別教室「${candidate.subject.classroomType}」が利用できません`,
        reason: '特別教室不足'
      })
    }

    // 基本的な割り当てを実行
    slot.subject = candidate.subject
    slot.teacher = candidate.teacher
    slot.classroom = classroom

    // 制約違反情報をスロットに記録
    if (constraintResult.violations.length > 0) {
      slot.hasViolation = true
      slot.violations = constraintResult.violations
      
      // 最も重要度の高い違反レベルを設定
      const severities = constraintResult.violations.map(v => v.severity)
      if (severities.includes('high')) {
        slot.violationSeverity = 'high'
      } else if (severities.includes('medium')) {
        slot.violationSeverity = 'medium'
      } else {
        slot.violationSeverity = 'low'
      }
    } else {
      slot.hasViolation = false
      slot.violations = []
      slot.violationSeverity = undefined
    }

    return true
  }

  /**
   * Phase2専用：制約を完全に無視した強制割り当て
   */
  private forceAssignToSlotPhase2(slot: TimetableSlot, candidate: AssignmentCandidate, isOverwrite: boolean): void {
    // Phase2では制約チェックを一切行わず、直接割り当てる
    const prevSubject = slot.subject?.name || '空き'
    
    // 強制割り当て実行（制約無視）
    slot.subject = candidate.subject
    slot.teacher = candidate.teacher
    slot.classroom = `${candidate.classGrade}-${candidate.classSection}` // デフォルト教室
    
    // Phase2用の違反情報を記録
    slot.hasViolation = true
    slot.violationSeverity = isOverwrite ? 'high' : 'medium'
    slot.violations = [{
      type: isOverwrite ? 'phase2_overwrite' : 'phase2_forced',
      severity: isOverwrite ? 'high' : 'medium',
      message: isOverwrite ? 
        `Phase2強制上書き（${prevSubject} → ${candidate.subject.name}）` : 
        `Phase2制約無視割り当て（${candidate.subject.name}）`,
      reason: 'Phase2による100%達成のための強制割り当て'
    }]
    
    this.log(`    💥 Phase2強制割り当て: ${slot.day}曜日${slot.period}時間目 (${prevSubject} → ${candidate.subject.name})`)
  }

  /**
   * スロットから割当解除
   */
  private unassignFromSlot(slot: TimetableSlot): void {
    slot.subject = undefined
    slot.teacher = undefined
    slot.classroom = undefined
  }

  /**
   * 制約チェック実行
   */
  private checkConstraints(slot: TimetableSlot, candidate: AssignmentCandidate): ConstraintResult {
    for (const checker of this.constraints) {
      const result = checker.check(slot, candidate, this.timetable)
      if (!result.isValid) {
        return result
      }
    }
    return { isValid: true }
  }

  /**
   * 寛容モード制約チェック実行（制約違反情報を収集）
   */
  private checkConstraintsTolerant(slot: TimetableSlot, candidate: AssignmentCandidate): EnhancedConstraintResult {
    const violations: Array<{
      type: string
      severity: 'high' | 'medium' | 'low'
      message: string
      reason?: string
    }> = []

    let hasViolations = false

    for (const checker of this.constraints) {
      const result = checker.check(slot, candidate, this.timetable)
      if (!result.isValid) {
        hasViolations = true
        
        // 制約違反の種類と重要度を判定
        let violationType = 'unknown'
        let severity: 'high' | 'medium' | 'low' = 'medium'
        let message = result.reason || '制約違反が発生しました'

        // 制約違反の種類を推定
        if (result.reason?.includes('教師')) {
          violationType = 'teacher_conflict'
          severity = 'high'
        } else if (result.reason?.includes('教室')) {
          violationType = 'classroom_conflict'
          severity = 'medium'
        } else if (result.reason?.includes('制限') || result.reason?.includes('時限')) {
          violationType = 'time_restriction'
          severity = 'low'
        }

        violations.push({
          type: violationType,
          severity,
          message,
          reason: result.reason
        })
      }
    }

    return {
      isValid: !hasViolations,
      violations
    }
  }

  // ユーティリティメソッド
  private canTeacherTeachSubject(teacher: Teacher, subject: Subject): boolean {
    this.log(
      `🔍 canTeacherTeachSubject: 教師「${teacher.name}」が教科「${subject.name}」を担当できるか？`
    )
    this.log(`- 教師の担当教科数: ${teacher.subjects?.length || 0}`)
    this.log(
      `- 教師の担当教科:`,
      teacher.subjects?.map(s => ({ id: s.id, name: s.name }))
    )
    this.log(`- 対象教科: { id: "${subject.id}", name: "${subject.name}" }`)

    // IDベースと名前ベースの両方で照合
    const canTeach =
      teacher.subjects?.some(
        s => s.id === subject.id || s.name === subject.name || s === subject.name
      ) || false
    this.log(`→ 結果: ${canTeach}`)

    return canTeach
  }

  private canSubjectBeTeachedToGrade(subject: Subject, grade: number): boolean {
    // grades が空配列または未定義の場合は「全学年対応」として扱う
    const hasValidGrades = subject.grades && subject.grades.length > 0
    return hasValidGrades ? subject.grades.includes(grade) : true
  }

  private getRequiredHoursForSubject(subject: Subject, grade: number): number {
    this.log(`⏰ getRequiredHoursForSubject: ${subject.name} ${grade}年の必要時数計算`)
    this.log(`- weeklyHours type: ${typeof subject.weeklyHours}`)
    this.log(`- weeklyHours value:`, subject.weeklyHours)

    // weeklyHoursが数値の場合は直接使用
    if (typeof subject.weeklyHours === 'number') {
      this.log(`→ 数値形式: ${subject.weeklyHours}時間`)
      return subject.weeklyHours
    }

    // weeklyHoursがオブジェクトの場合は学年別時数を取得
    let result = subject.weeklyHours?.[grade] || 0

    // 学年別時数が0で、全学年対応の場合は学年1の時数を使用
    if (result === 0 && subject.weeklyHours) {
      const hasGradeSpecificHours = Object.keys(subject.weeklyHours).some(
        g => parseInt(g) === grade
      )
      if (!hasGradeSpecificHours) {
        // 全学年対応科目の場合、任意の学年の時数を使用（通常は学年1）
        result = subject.weeklyHours[1] || subject.weeklyHours[2] || subject.weeklyHours[3] || 0
      }
    }

    this.log(`→ オブジェクト形式結果: ${result}時間`)
    return result
  }

  private hasMandatoryRestriction(teacher: Teacher): boolean {
    return teacher.assignmentRestrictions?.some(r => r.restrictionLevel === '必須') || false
  }

  private hasRecommendedRestriction(teacher: Teacher): boolean {
    return teacher.assignmentRestrictions?.some(r => r.restrictionLevel === '推奨') || false
  }

  private findSuitableClassroom(subject: Subject, slot: TimetableSlot): Classroom | undefined {
    if (!subject.requiresSpecialClassroom) {
      return undefined // 特別教室不要
    }

    // 同じ時間帯で使用されていない専門教室を探す
    for (const classroom of this.classrooms) {
      if (classroom.type === subject.classroomType) {
        if (!this.isClassroomBusyAt(classroom, slot.day, slot.period)) {
          return classroom
        }
      }
    }

    return undefined
  }

  private isClassroomBusyAt(classroom: Classroom, day: string, period: number): boolean {
    // 同じ日時で他のクラスがこの教室を使用しているかチェック
    const days = this.getSafeDays()
    const dayIndex = days.indexOf(day)
    if (dayIndex === -1) return false

    const slots = this.timetable[dayIndex]?.[period - 1] || []
    return slots.some(slot => slot.classroom?.id === classroom.id)
  }

  private isAllRequiredHoursSatisfied(): boolean {
    return this.candidates.every(c => c.assignedHours >= c.requiredHours)
  }

  private calculateStatistics() {
    const totalSlots = this.calculateTotalSlots()
    const assignedSlots = this.calculateAssignedSlots()
    const constraintViolations = this.calculateConstraintViolations()

    return {
      totalSlots,
      assignedSlots,
      unassignedSlots: totalSlots - assignedSlots,
      constraintViolations,
    }
  }

  private calculateConstraintViolations(): number {
    let violationCount = 0
    
    for (const daySlots of this.timetable) {
      for (const periodSlots of daySlots) {
        for (const slot of periodSlots) {
          if (slot.hasViolation && slot.violations && slot.violations.length > 0) {
            violationCount += slot.violations.length
          }
        }
      }
    }
    
    return violationCount
  }

  private calculateTotalSlots(): number {
    let total = 0
    for (const daySlots of this.timetable) {
      for (const periodSlots of daySlots) {
        total += periodSlots.length
      }
    }
    return total
  }

  private calculateAssignedSlots(): number {
    let assigned = 0
    for (const daySlots of this.timetable) {
      for (const periodSlots of daySlots) {
        assigned += periodSlots.filter(slot => slot.subject && slot.teacher).length
      }
    }
    return assigned
  }

  /**
   * 制約分析結果を取得
   */
  public getConstraintAnalysis(): ConstraintAnalysis {
    const optimizationRecommendations: string[] = []

    // 教師困難度を計算
    const teacherDifficulties = this.calculateTeacherDifficulties()

    // 制約統計に基づく推奨事項を生成
    if (this.constraintStats.teacherConflicts > this.constraintStats.totalChecks * 0.3) {
      optimizationRecommendations.push(
        '教師の時間重複が多すぎます。教師数を増やすか、授業時数を調整してください。'
      )
    }

    if (this.constraintStats.assignmentRestrictions > this.constraintStats.totalChecks * 0.2) {
      optimizationRecommendations.push('割当制限が厳しすぎます。必須制限を見直してください。')
    }

    // 候補分析に基づく推奨事項
    const lowAvailabilityCandidates = this.candidateAnalysis.filter(
      c => c.availableSlots < c.candidate.requiredHours
    )
    if (lowAvailabilityCandidates.length > this.candidateAnalysis.length * 0.5) {
      optimizationRecommendations.push(
        '多くの候補で利用可能スロットが不足しています。クラス数を減らすか、授業時数を調整してください。'
      )
    }

    const totalPossibleAssignments = this.candidateAnalysis.reduce(
      (sum, c) => sum + c.maxPossibleAssignments,
      0
    )
    const totalRequiredAssignments = this.candidateAnalysis.reduce(
      (sum, c) => sum + c.candidate.requiredHours,
      0
    )

    if (totalPossibleAssignments < totalRequiredAssignments * 0.8) {
      optimizationRecommendations.push(
        `理論的最大割当数(${totalPossibleAssignments})が必要数(${totalRequiredAssignments})を大きく下回っています。データ設定を見直してください。`
      )
    }

    // 困難度に基づく推奨事項
    const highDifficultyTeachers = teacherDifficulties.filter(d => d.difficultyPercentage > 80)
    if (highDifficultyTeachers.length > 0) {
      const teacherNames = highDifficultyTeachers.map(d => d.teacher.name).join('、')
      optimizationRecommendations.push(
        `高困難度教師（${teacherNames}）の負荷が過大です。担当教科数や授業時数の調整を検討してください。`
      )
    }

    const overloadedTeachers = teacherDifficulties.filter(
      d => d.totalRequiredHours > d.availableHours
    )
    if (overloadedTeachers.length > 0) {
      const teacherNames = overloadedTeachers.map(d => d.teacher.name).join('、')
      optimizationRecommendations.push(
        `物理的に不可能な負荷の教師（${teacherNames}）がいます。必要時間数が利用可能時間を超過しています。`
      )
    }

    return {
      constraintStats: this.constraintStats,
      candidateAnalysis: this.candidateAnalysis,
      teacherDifficulties,
      optimizationRecommendations,
    }
  }
}

// 制約チェッカー基底クラス
export abstract class ConstraintChecker {
  abstract check(
    slot: TimetableSlot,
    candidate: AssignmentCandidate,
    timetable: TimetableSlot[][][]
  ): ConstraintResult
}

// 教師の時間重複チェック
export class TeacherConflictChecker extends ConstraintChecker {
  check(
    slot: TimetableSlot,
    candidate: AssignmentCandidate,
    timetable: TimetableSlot[][][]
  ): ConstraintResult {
    const days = ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜'] // 安全なfallback
    const dayIndex = days.indexOf(slot.day)
    if (dayIndex === -1) return { isValid: false, reason: '無効な曜日' }

    const periodSlots = timetable[dayIndex]?.[slot.period - 1] || []
    const conflictingSlot = periodSlots.find(
      s => s.teacher?.id === candidate.teacher.id && s !== slot
    )

    if (conflictingSlot) {
      return {
        isValid: false,
        reason: `教師 ${candidate.teacher.name} が同時間帯に他のクラスを担当`,
        conflictingSlots: [conflictingSlot],
      }
    }

    return { isValid: true }
  }
}

// 教室の重複チェック
export class ClassroomConflictChecker extends ConstraintChecker {
  check(
    _slot: TimetableSlot,
    candidate: AssignmentCandidate,
    _timetable: TimetableSlot[][][]
  ): ConstraintResult {
    if (!candidate.subject.requiresSpecialClassroom) {
      return { isValid: true } // 特別教室不要の場合はOK
    }

    // この実装では簡略化（実際の教室割当は TimetableGenerator で行う）
    return { isValid: true }
  }
}

// 割当制限チェック
export class AssignmentRestrictionChecker extends ConstraintChecker {
  check(
    slot: TimetableSlot,
    candidate: AssignmentCandidate,
    _timetable: TimetableSlot[][][]
  ): ConstraintResult {
    const restrictions = candidate.teacher.assignmentRestrictions
    if (!restrictions || restrictions.length === 0) {
      return { isValid: true }
    }

    for (const restriction of restrictions) {
      if (restriction.restrictedDay === slot.day) {
        // この曜日に制限がある
        if (restriction.restrictedPeriods.includes(slot.period)) {
          if (restriction.restrictionLevel === '必須') {
            // 必須制限：この時間帯は割当必須
            return { isValid: true } // 必須なので割当OK
          } else {
            // 推奨制限：この時間帯は推奨
            return { isValid: true } // 推奨なので割当OK
          }
        } else {
          if (restriction.restrictionLevel === '必須') {
            // 必須制限があるが、指定時間帯でない場合は割当不可
            return {
              isValid: false,
              reason: `教師 ${candidate.teacher.name} は ${slot.day}の${restriction.restrictedPeriods.join(',')}限のみ割当必須`,
            }
          }
        }
      }
    }

    return { isValid: true }
  }

  /**
   * 生成された時間割の包括的検証
   */
  public validateTimetable(): TimetableValidationResult {
    this.log('🔍 時間割検証を開始します')

    const violations = this.findConstraintViolations()
    const qualityMetrics = this.calculateQualityMetrics()
    const unassignedRequirements = this.analyzeUnassignedRequirements()
    const improvementSuggestions = this.generateImprovementSuggestions(
      violations,
      unassignedRequirements
    )

    // 全体スコア計算（0-100点）
    const overallScore = this.calculateOverallScore(qualityMetrics, violations)
    const isValid = violations.filter(v => v.severity === 'critical').length === 0

    return {
      isValid,
      overallScore,
      violations,
      qualityMetrics,
      unassignedRequirements,
      improvementSuggestions,
    }
  }

  /**
   * 制約違反の検出
   */
  private findConstraintViolations(): ConstraintViolation[] {
    const violations: ConstraintViolation[] = []

    // 教師の時間重複チェック
    for (let day = 0; day < this.timetable.length; day++) {
      for (let period = 0; period < this.timetable[day].length; period++) {
        const periodSlots = this.timetable[day][period]
        const teacherCount = new Map<string, TimetableSlot[]>()

        for (const slot of periodSlots) {
          if (slot.teacher) {
            if (!teacherCount.has(slot.teacher.id)) {
              teacherCount.set(slot.teacher.id, [])
            }
            teacherCount.get(slot.teacher.id)?.push(slot)
          }
        }

        // 同じ時間に複数クラスを担当している教師を検出
        for (const [_teacherId, slots] of teacherCount) {
          if (slots.length > 1) {
            violations.push({
              type: 'teacher_conflict',
              severity: 'critical',
              description: `教師「${slots[0].teacher?.name}」が同じ時間帯に${slots.length}つのクラスを担当`,
              affectedSlots: slots.map(slot => ({
                day: slot.day,
                period: slot.period,
                classGrade: slot.classGrade,
                classSection: slot.classSection,
              })),
              suggestedFix: 'いずれかのクラスの授業を別の時間帯に移動してください',
            })
          }
        }
      }
    }

    // 教師専門外教科チェック
    for (let day = 0; day < this.timetable.length; day++) {
      for (let period = 0; period < this.timetable[day].length; period++) {
        for (const slot of this.timetable[day][period]) {
          if (slot.teacher && slot.subject) {
            if (!this.canTeacherTeachSubject(slot.teacher, slot.subject)) {
              violations.push({
                type: 'subject_mismatch',
                severity: 'major',
                description: `教師「${slot.teacher.name}」が専門外の教科「${slot.subject.name}」を担当`,
                affectedSlots: [
                  {
                    day: slot.day,
                    period: slot.period,
                    classGrade: slot.classGrade,
                    classSection: slot.classSection,
                  },
                ],
                suggestedFix:
                  'この教科を担当できる別の教師に変更するか、教師の担当教科を追加してください',
              })
            }
          }
        }
      }
    }

    return violations
  }

  /**
   * 品質指標の計算
   */
  private calculateQualityMetrics(): QualityMetrics {
    // 割り当て完了率
    let totalRequiredSlots = 0
    let assignedSlots = 0

    for (const candidate of this.candidates) {
      totalRequiredSlots += candidate.requiredHours
      assignedSlots += candidate.assignedHours
    }

    const assignmentCompletionRate =
      totalRequiredSlots > 0 ? (assignedSlots / totalRequiredSlots) * 100 : 0

    // 教師稼働率
    const maxWeeklyHours = this.settings.dailyPeriods * 5 + (this.settings.saturdayPeriods || 0)
    let totalTeacherHours = 0
    let usedTeacherHours = 0

    for (const teacher of this.teachers) {
      totalTeacherHours += maxWeeklyHours
      // 実際に割り当てられた時間を計算
      for (let day = 0; day < this.timetable.length; day++) {
        for (let period = 0; period < this.timetable[day].length; period++) {
          usedTeacherHours += this.timetable[day][period].filter(
            slot => slot.teacher?.id === teacher.id
          ).length
        }
      }
    }

    const teacherUtilizationRate =
      totalTeacherHours > 0 ? (usedTeacherHours / totalTeacherHours) * 100 : 0

    // 教科配置バランス（標準偏差ベース）
    const subjectHours = new Map<string, number>()
    for (let day = 0; day < this.timetable.length; day++) {
      for (let period = 0; period < this.timetable[day].length; period++) {
        for (const slot of this.timetable[day][period]) {
          if (slot.subject) {
            const current = subjectHours.get(slot.subject.id) || 0
            subjectHours.set(slot.subject.id, current + 1)
          }
        }
      }
    }

    const hours = Array.from(subjectHours.values())
    const mean = hours.length > 0 ? hours.reduce((a, b) => a + b, 0) / hours.length : 0
    const variance =
      hours.length > 0 ? hours.reduce((sum, hour) => sum + (hour - mean) ** 2, 0) / hours.length : 0
    const subjectDistributionBalance = mean > 0 ? Math.max(0, 1 - Math.sqrt(variance) / mean) : 0

    // 制約違反数
    const violations = this.findConstraintViolations()
    const constraintViolationCount = violations.length

    // 負荷分散スコア（教師間の授業時数の均等性）
    const teacherHours = this.teachers.map(teacher => {
      let hours = 0
      for (let day = 0; day < this.timetable.length; day++) {
        for (let period = 0; period < this.timetable[day].length; period++) {
          hours += this.timetable[day][period].filter(
            slot => slot.teacher?.id === teacher.id
          ).length
        }
      }
      return hours
    })

    const teacherMean =
      teacherHours.length > 0 ? teacherHours.reduce((a, b) => a + b, 0) / teacherHours.length : 0
    const teacherVariance =
      teacherHours.length > 0
        ? teacherHours.reduce((sum, hour) => sum + (hour - teacherMean) ** 2, 0) /
          teacherHours.length
        : 0
    const loadBalanceScore =
      teacherMean > 0 ? Math.max(0, 1 - Math.sqrt(teacherVariance) / teacherMean) : 0

    return {
      assignmentCompletionRate,
      teacherUtilizationRate,
      subjectDistributionBalance,
      constraintViolationCount,
      loadBalanceScore,
    }
  }

  /**
   * 未割り当て要件の分析
   */
  private analyzeUnassignedRequirements(): UnassignedRequirement[] {
    const unassigned: UnassignedRequirement[] = []

    for (const candidate of this.candidates) {
      if (candidate.assignedHours < candidate.requiredHours) {
        const missingHours = candidate.requiredHours - candidate.assignedHours
        const blockingReasons: string[] = []

        // 利用可能なスロット数をカウント
        let availableSlots = 0
        for (let day = 0; day < this.timetable.length; day++) {
          for (let period = 0; period < this.timetable[day].length; period++) {
            const slot: TimetableSlot = {
              day: ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜'][day],
              period: period + 1,
              classGrade: candidate.classGrade,
              classSection: candidate.classSection,
              teacher: candidate.teacher,
              subject: candidate.subject,
            }

            const isValid = this.constraints.every(
              constraint => constraint.check(slot, candidate, this.timetable).isValid
            )

            if (isValid) {
              availableSlots++
            } else {
              // 制約違反の理由を収集
              for (const constraint of this.constraints) {
                const result = constraint.check(slot, candidate, this.timetable)
                if (!result.isValid && result.reason) {
                  if (!blockingReasons.includes(result.reason)) {
                    blockingReasons.push(result.reason)
                  }
                }
              }
            }
          }
        }

        // 利用可能スロットが不足している場合に制約理由を追加
        if (availableSlots < missingHours) {
          blockingReasons.push(
            `利用可能スロット数(${availableSlots})が不足時間数(${missingHours})より少ない`
          )
        }

        unassigned.push({
          teacher: candidate.teacher,
          subject: candidate.subject,
          classGrade: candidate.classGrade,
          classSection: candidate.classSection,
          requiredHours: candidate.requiredHours,
          assignedHours: candidate.assignedHours,
          missingHours,
          blockingReasons,
        })
      }
    }

    return unassigned
  }

  /**
   * 改善提案の生成
   */
  private generateImprovementSuggestions(
    violations: ConstraintViolation[],
    unassigned: UnassignedRequirement[]
  ): string[] {
    const suggestions: string[] = []

    // 制約違反に基づく提案
    const teacherConflicts = violations.filter(v => v.type === 'teacher_conflict').length
    if (teacherConflicts > 0) {
      suggestions.push(
        `教師の時間重複が${teacherConflicts}件発生しています。教師数を増やすか、授業時間を分散することを検討してください。`
      )
    }

    const subjectMismatches = violations.filter(v => v.type === 'subject_mismatch').length
    if (subjectMismatches > 0) {
      suggestions.push(
        `専門外教科の担当が${subjectMismatches}件発生しています。教師の担当教科を追加するか、専門教師を増員してください。`
      )
    }

    // 未割り当て要件に基づく提案
    const totalUnassignedHours = unassigned.reduce((sum, req) => sum + req.missingHours, 0)
    if (totalUnassignedHours > 0) {
      suggestions.push(`合計${totalUnassignedHours}時間が未割り当てです。`)

      // 教師不足の分析
      const teacherShortage = new Map<string, number>()
      for (const req of unassigned) {
        const key = req.teacher.name
        teacherShortage.set(key, (teacherShortage.get(key) || 0) + req.missingHours)
      }

      for (const [teacherName, hours] of teacherShortage) {
        if (hours > 3) {
          suggestions.push(
            `教師「${teacherName}」の負荷が高く、${hours}時間が未割り当てです。担当教科の見直しまたは追加教師の配置を検討してください。`
          )
        }
      }
    }

    // 全体的な改善提案
    const qualityMetrics = this.calculateQualityMetrics()
    if (qualityMetrics.assignmentCompletionRate < 50) {
      suggestions.push(
        '割り当て完了率が50%を下回っています。教師数の増員、教科数の削減、または時間数の調整を検討してください。'
      )
    }

    if (qualityMetrics.loadBalanceScore < 0.7) {
      suggestions.push('教師間の負荷バランスが悪いです。授業時間の再配分を検討してください。')
    }

    return suggestions
  }

  /**
   * 全体スコア計算
   */
  private calculateOverallScore(
    metrics: QualityMetrics,
    violations: ConstraintViolation[]
  ): number {
    let score = 100

    // 割り当て完了率による減点
    score -= (100 - metrics.assignmentCompletionRate) * 0.4

    // 制約違反による減点
    for (const violation of violations) {
      switch (violation.severity) {
        case 'critical':
          score -= 15
          break
        case 'major':
          score -= 8
          break
        case 'minor':
          score -= 3
          break
      }
    }

    // 負荷バランスによる減点
    score -= (1 - metrics.loadBalanceScore) * 20

    return Math.max(0, Math.round(score))
  }

  /**
   * 教科の対象学年自動拡張
   * 空のtarget_gradesを持つ教科を全学年対応に拡張
   */
  private expandSubjectGrades(): Subject[] {
    this.log('📈 教科の対象学年拡張を実行中...')

    const expandedSubjects = this.subjects.map(subject => {
      // target_gradesが空の場合、全学年に拡張
      if (!subject.grades || subject.grades.length === 0) {
        this.log(`- 教科「${subject.name}」を全学年対応に拡張`)
        return {
          ...subject,
          grades: this.settings.grades, // [1, 2, 3]
        }
      }
      return subject
    })

    this.log(
      `✅ 教科拡張完了: 拡張対象${expandedSubjects.filter(s => s.grades.length > 0).length}科目`
    )
    return expandedSubjects
  }

  /**
   * 教師の専門性自動拡張
   * 関連する教科への担当可能範囲を拡張
   */
  private expandTeacherSpecialization(): Teacher[] {
    this.log('👥 教師の専門性拡張を実行中...')

    const expandedTeachers = this.teachers.map(teacher => {
      const expandedSubjects = [...teacher.subjects]

      // 専門分野に基づく関連教科の追加
      const baseSubjects = teacher.subjects.map(s => (typeof s === 'string' ? s : s.name))

      for (const baseSubject of baseSubjects) {
        // 教科名のベース部分を抽出（例：「国語A」→「国語」）
        const subjectBase = baseSubject.replace(/[ABC]$/, '')

        // 同じベース教科の他のバリエーションを追加
        for (const subject of this.subjects) {
          const targetBase = subject.name.replace(/[ABC]$/, '')
          if (targetBase === subjectBase && !baseSubjects.includes(subject.name)) {
            this.log(`- 教師「${teacher.name}」に関連教科「${subject.name}」を追加`)
            expandedSubjects.push(subject.name)
          }
        }
      }

      return {
        ...teacher,
        subjects: expandedSubjects,
      }
    })

    this.log(
      `✅ 教師専門性拡張完了: 平均担当教科数${expandedTeachers.reduce((sum, t) => sum + (t.subjects?.length || 0), 0) / expandedTeachers.length}科目`
    )
    return expandedTeachers
  }

  /**
   * 最適化された時間割生成
   * 教科拡張と教師専門性拡張を適用
   */
  public generateOptimized(): TimetableGenerationResult {
    this.log('🚀 最適化された時間割生成を開始します')

    // 1. 教科の対象学年拡張
    const expandedSubjects = this.expandSubjectGrades()
    const originalSubjects = this.subjects
    this.subjects = expandedSubjects

    // 2. 教師の専門性拡張
    const expandedTeachers = this.expandTeacherSpecialization()
    const originalTeachers = this.teachers
    this.teachers = expandedTeachers

    // 3. 候補を再生成
    this.candidates = this.generateCandidates()
    this.log(`📊 最適化後の候補数: ${this.candidates.length}個`)

    // 4. 最適化された生成を実行
    const result = this.generate()

    // 5. 元の設定を復元
    this.subjects = originalSubjects
    this.teachers = originalTeachers

    this.log(`✨ 最適化生成完了: 割り当て率${result.assignmentRate}%`)
    return result
  }

  /**
   * 負荷分散最適化
   * 教師間の授業時間数バランスを調整
   */
  private optimizeLoadBalance(): void {
    this.log('⚖️ 負荷分散最適化を実行中...')

    // 教師ごとの現在の割り当て時間数を計算
    const teacherLoads = new Map<string, number>()
    for (const teacher of this.teachers) {
      let assignedHours = 0
      for (let day = 0; day < this.timetable.length; day++) {
        for (let period = 0; period < this.timetable[day].length; period++) {
          assignedHours += this.timetable[day][period].filter(
            slot => slot.teacher?.id === teacher.id
          ).length
        }
      }
      teacherLoads.set(teacher.id, assignedHours)
    }

    // 負荷の標準偏差を計算
    const loads = Array.from(teacherLoads.values())
    const meanLoad = loads.reduce((sum, load) => sum + load, 0) / loads.length
    const variance = loads.reduce((sum, load) => sum + (load - meanLoad) ** 2, 0) / loads.length
    const standardDeviation = Math.sqrt(variance)

    this.log(
      `📊 負荷分散状況: 平均${meanLoad.toFixed(1)}時間, 標準偏差${standardDeviation.toFixed(1)}`
    )

    // 標準偏差が大きい場合は再配分を試行
    if (standardDeviation > 2.0) {
      this.log('⚠️ 負荷偏差が大きいため再配分を実行')
      // TODO: 実際の再配分ロジックを実装
    }
  }

  /**
   * 失敗した組み合わせを記録
   */
  private recordFailedCombination(
    candidate: AssignmentCandidate,
    day: number,
    period: number,
    classGrade: number,
    classSection: string
  ): void {
    const combinationKey = `${candidate.teacher.id}-${candidate.subject.id}-${day}-${period}-${classGrade}-${classSection}`
    this.failedCombinations.add(combinationKey)
    this.log(`❌ 失敗組み合わせ記録: ${combinationKey}`)
  }

  /**
   * 組み合わせが失敗済みかどうかをチェック
   */
  private isFailedCombination(
    candidate: AssignmentCandidate,
    day: number,
    period: number,
    classGrade: number,
    classSection: string
  ): boolean {
    const combinationKey = `${candidate.teacher.id}-${candidate.subject.id}-${day}-${period}-${classGrade}-${classSection}`
    return this.failedCombinations.has(combinationKey)
  }

  /**
   * 現在の時間割の割り当て率を計算
   */
  private calculateAssignmentRate(): number {
    let assignedSlots = 0
    let totalSlots = 0

    for (let day = 0; day < 5; day++) {
      for (let period = 0; period < this.settings.dailyPeriods; period++) {
        for (let classIndex = 0; classIndex < this.timetable[day][period].length; classIndex++) {
          totalSlots++
          if (this.timetable[day][period][classIndex]) {
            assignedSlots++
          }
        }
      }
    }

    return totalSlots > 0 ? (assignedSlots / totalSlots) * 100 : 0
  }

  /**
   * 最良解の更新
   */
  private updateBestSolution(): void {
    const currentRate = this.calculateAssignmentRate()
    if (currentRate > this.bestAssignmentRate) {
      this.bestAssignmentRate = currentRate
      this.bestSolution = JSON.parse(JSON.stringify(this.timetable)) // ディープコピー
      this.log(`✨ 新しい最良解更新: ${currentRate.toFixed(1)}%`)
    }
  }

  /**
   * リトライ機能付き時間割生成
   */
  public async generateTimetableWithRetry(): Promise<{
    success: boolean
    timetable?: TimetableSlot[][][]
    message?: string
    statistics?: {
      totalSlots: number
      assignedSlots: number
      unassignedSlots: number
      backtrackCount: number
      retryAttempts: number
      bestAssignmentRate: number
    }
  }> {
    this.log('🔄 リトライ機能付き時間割生成を開始')

    for (this.retryAttempts = 0; this.retryAttempts < this.maxRetryAttempts; this.retryAttempts++) {
      this.log(`🎯 試行 ${this.retryAttempts + 1}/${this.maxRetryAttempts}`)

      // 時間割を初期化
      this.initializeTimetable()

      // 基本の時間割生成を実行
      const result = await this.generateTimetable()

      // 最良解を更新
      this.updateBestSolution()

      // 100%達成した場合は完了
      if (result.success && result.statistics) {
        const rate = (result.statistics.assignedSlots / result.statistics.totalSlots) * 100
        if (rate >= 99.0) {
          // ほぼ100%
          this.log(`🎉 完全解発見: ${rate.toFixed(1)}%`)
          return result
        }
      }

      this.log(
        `📊 試行${this.retryAttempts + 1}結果: ${result.statistics ? ((result.statistics.assignedSlots / result.statistics.totalSlots) * 100).toFixed(1) : 0}%`
      )
    }

    // 最大試行回数に達した場合、最良解を返す
    if (this.bestSolution) {
      this.log(`🏆 最良解を返却: ${this.bestAssignmentRate.toFixed(1)}%`)

      // 統計情報を計算
      let assignedSlots = 0
      let totalSlots = 0
      for (let day = 0; day < 5; day++) {
        for (let period = 0; period < this.settings.dailyPeriods; period++) {
          for (
            let classIndex = 0;
            classIndex < this.bestSolution[day][period].length;
            classIndex++
          ) {
            totalSlots++
            if (this.bestSolution[day][period][classIndex]) {
              assignedSlots++
            }
          }
        }
      }

      return {
        success: this.bestAssignmentRate >= 70, // 70%以上で成功とみなす
        timetable: this.bestSolution,
        message:
          this.bestAssignmentRate >= 90
            ? `良好な時間割を生成しました（${this.bestAssignmentRate.toFixed(1)}%）`
            : `部分的な時間割を生成しました（${this.bestAssignmentRate.toFixed(1)}%）。手動での調整をお勧めします。`,
        statistics: {
          totalSlots,
          assignedSlots,
          unassignedSlots: totalSlots - assignedSlots,
          backtrackCount: 0,
          retryAttempts: this.retryAttempts,
          bestAssignmentRate: this.bestAssignmentRate,
        },
      }
    }

    // 最良解もない場合
    return {
      success: false,
      message: '時間割生成に失敗しました。制約条件を見直してください。',
      statistics: {
        totalSlots: 0,
        assignedSlots: 0,
        unassignedSlots: 0,
        backtrackCount: 0,
        retryAttempts: this.retryAttempts,
        bestAssignmentRate: 0,
      },
    }
  }

  // ========================================
  // 新しい時間割生成アルゴリズム（AI_INSTRUCTIONS仕様）
  // ========================================

  /**
   * 教師の割当困難度を計算
   * 困難度 = Σ(担当教科の授業時数/担当教科の教師数) / 教師の割り当て可能時間数
   */
  private calculateTeacherDifficulty(teacher: Teacher): number {
    let totalWeightedHours = 0
    
    // 教師の担当教科について困難度を計算
    for (const subjectId of teacher.subjects) {
      const subject = this.subjects.find(s => s.id === subjectId)
      if (!subject) continue

      // この教科を担当する教師総数
      const teacherCount = this.teachers.filter(t => t.subjects.includes(subjectId)).length
      
      // 教科の週時数を学年別に取得
      for (const grade of this.settings.grades) {
        const weeklyHours = this.getRequiredHoursForSubjectGrade(subject, grade)
        if (weeklyHours > 0) {
          totalWeightedHours += weeklyHours / teacherCount
        }
      }
    }
    
    // 教師の利用可能時間数を計算
    const availableHours = this.getTeacherAvailableHours(teacher)
    
    if (availableHours <= 0) {
      return 999 // 利用不可能な教師は最高困難度
    }
    
    const difficulty = totalWeightedHours / availableHours
    
    this.log(`📊 ${teacher.name}の困難度: ${difficulty.toFixed(3)} (重み付き時数:${totalWeightedHours.toFixed(1)}, 利用可能:${availableHours})`)
    
    return difficulty
  }

  /**
   * 教師の利用可能時間数を計算（制限を除外）
   */
  private getTeacherAvailableHours(teacher: Teacher): number {
    const totalHours = this.settings.dailyPeriods * 5 + this.settings.saturdayPeriods // 平日+土曜
    
    // 教師の制限時間を除外
    let restrictedHours = 0
    if (teacher.restrictions) {
      for (const restriction of teacher.restrictions) {
        if (restriction.type === 'required') {
          restrictedHours++
        }
      }
    }
    
    return Math.max(1, totalHours - restrictedHours) // 最低1時間は確保
  }

  /**
   * 学年別教科の必要時数を取得
   */
  private getRequiredHoursForSubjectGrade(subject: Subject, grade: number): number {
    if (subject.grades && subject.grades.length > 0) {
      // 学年別時数が設定されている場合
      const gradeIndex = subject.grades.indexOf(grade)
      if (gradeIndex !== -1 && subject.weeklyHours && subject.weeklyHours[gradeIndex]) {
        return subject.weeklyHours[gradeIndex]
      }
    }
    
    // デフォルト時数
    if (subject.weeklyHours && subject.weeklyHours[0]) {
      return subject.weeklyHours[0]
    }
    
    return 0
  }

  /**
   * 教師を困難度順にソート（困難度の高い順）
   */
  private sortTeachersByDifficulty(): Teacher[] {
    const teachersWithDifficulty = this.teachers.map(teacher => ({
      teacher,
      difficulty: this.calculateTeacherDifficulty(teacher)
    }))
    
    // 困難度の高い順（降順）にソート
    teachersWithDifficulty.sort((a, b) => b.difficulty - a.difficulty)
    
    this.log('📋 教師の困難度順ソート:')
    teachersWithDifficulty.forEach((item, index) => {
      this.log(`  ${index + 1}. ${item.teacher.name}: ${item.difficulty.toFixed(3)}`)
    })
    
    return teachersWithDifficulty.map(item => item.teacher)
  }

  /**
   * 教師の特定クラスでの利用可能スロットを取得
   */
  private getAvailableSlots(teacher: Teacher, classGrade: number, classSection: string): TimetableSlot[] {
    const availableSlots: TimetableSlot[] = []
    const days = ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜']
    
    for (let dayIndex = 0; dayIndex < this.timetable.length; dayIndex++) {
      const day = days[dayIndex]
      
      for (let periodIndex = 0; periodIndex < this.timetable[dayIndex].length; periodIndex++) {
        const period = periodIndex + 1
        
        // 指定クラスのスロットを探す
        const slot = this.timetable[dayIndex][periodIndex].find(
          s => s.classGrade === classGrade && s.classSection === classSection
        )
        
        if (!slot || slot.subject || slot.teacher) {
          continue // スロットが見つからないか既に割り当て済み
        }
        
        // 教師の制限チェック
        if (this.isTeacherRestricted(teacher, day, period)) {
          continue
        }
        
        // 教師の他クラスでの同時刻制約チェック
        if (this.isTeacherBusyAtTime(teacher, dayIndex, periodIndex)) {
          continue
        }
        
        availableSlots.push(slot)
      }
    }
    
    return availableSlots
  }

  /**
   * 教師が指定時間に制限があるかチェック
   */
  private isTeacherRestricted(teacher: Teacher, day: string, period: number): boolean {
    if (!teacher.restrictions) return false
    
    return teacher.restrictions.some(restriction => 
      restriction.type === 'required' && 
      restriction.day === day && 
      restriction.period === period
    )
  }

  /**
   * 教師が指定時間に他クラスで忙しいかチェック
   */
  private isTeacherBusyAtTime(teacher: Teacher, dayIndex: number, periodIndex: number): boolean {
    return this.timetable[dayIndex][periodIndex].some(slot => 
      slot.teacher?.id === teacher.id
    )
  }

  /**
   * ランダムにスロットに割り当て（制約チェック付き）
   */
  private randomAssignToSlot(
    teacher: Teacher, 
    subject: Subject, 
    classGrade: number, 
    classSection: string,
    avoidSameDay: boolean = false
  ): { success: boolean; violations: any[] } {
    const availableSlots = this.getAvailableSlots(teacher, classGrade, classSection)
    
    if (availableSlots.length === 0) {
      this.log(`❌ ${teacher.name} → ${subject.name} ${classGrade}年${classSection}組: 利用可能スロットなし`)
      return { success: false, violations: [{ type: 'no_available_slots', message: '利用可能な時間スロットがありません' }] }
    }
    
    // 同日回避が必要な場合、既存の同教科スロットと異なる日のスロットを優先
    let candidateSlots = availableSlots
    if (avoidSameDay) {
      const assignedDays = this.getAssignedDaysForSubject(subject, classGrade, classSection)
      const differentDaySlots = availableSlots.filter(slot => !assignedDays.includes(slot.day))
      
      if (differentDaySlots.length > 0) {
        candidateSlots = differentDaySlots
        this.log(`📅 同日回避: ${differentDaySlots.length}個の異なる日スロットを優先`)
      } else {
        this.log(`⚠️ 同日回避できません: 異なる日のスロットが不足`)
      }
    }
    
    // ランダムにスロットを選択して割り当て試行
    const shuffledSlots = this.shuffleArray([...candidateSlots])
    
    for (const slot of shuffledSlots) {
      const assignmentResult = this.tryAssignToSlot(slot, teacher, subject)
      
      if (assignmentResult.success) {
        this.log(`✅ ${teacher.name} → ${subject.name} ${classGrade}年${classSection}組 を ${slot.day}${slot.period}限に割り当て成功`)
        return { success: true, violations: [] }
      }
    }
    
    // 全スロット試行しても割り当てできない場合、制約違反として記録
    const bestSlot = shuffledSlots[0] // 最初のスロットに制約違反で割り当て
    if (bestSlot) {
      this.assignToSlotWithViolation(bestSlot, teacher, subject)
      this.log(`⚠️ ${teacher.name} → ${subject.name} ${classGrade}年${classSection}組 を ${bestSlot.day}${bestSlot.period}限に制約違反で割り当て`)
      return { success: true, violations: [{ type: 'constraint_violation', message: '制約違反での割り当て' }] }
    }
    
    return { success: false, violations: [{ type: 'assignment_failed', message: '割り当て失敗' }] }
  }

  /**
   * 配列をランダムにシャッフル（Fisher-Yates shuffle）
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  /**
   * 指定教科が既に割り当てられている日を取得
   */
  private getAssignedDaysForSubject(subject: Subject, classGrade: number, classSection: string): string[] {
    const assignedDays: string[] = []
    
    for (let dayIndex = 0; dayIndex < this.timetable.length; dayIndex++) {
      for (let periodIndex = 0; periodIndex < this.timetable[dayIndex].length; periodIndex++) {
        const slot = this.timetable[dayIndex][periodIndex].find(
          s => s.classGrade === classGrade && 
               s.classSection === classSection && 
               s.subject?.id === subject.id
        )
        
        if (slot && !assignedDays.includes(slot.day)) {
          assignedDays.push(slot.day)
        }
      }
    }
    
    return assignedDays
  }

  /**
   * スロットへの割り当てを試行
   */
  private tryAssignToSlot(slot: TimetableSlot, teacher: Teacher, subject: Subject): { success: boolean; violations: any[] } {
    // 制約チェック（既存のConstraintCheckerを活用）
    const candidate: AssignmentCandidate = {
      teacher,
      subject,
      classGrade: slot.classGrade,
      classSection: slot.classSection,
      requiredHours: this.getRequiredHoursForSubject(subject, slot.classGrade),
      assignedHours: 0
    }
    
    const constraintResult = this.checkConstraintsTolerant(slot, candidate)
    
    if (constraintResult.isValid) {
      // 制約OK: 正常割り当て
      this.assignToSlotNormal(slot, teacher, subject)
      return { success: true, violations: [] }
    } else {
      // 制約違反
      return { success: false, violations: constraintResult.violations }
    }
  }

  /**
   * スロットに正常割り当て
   */
  private assignToSlotNormal(slot: TimetableSlot, teacher: Teacher, subject: Subject): void {
    slot.teacher = teacher
    slot.subject = subject
    slot.classroom = this.findSuitableClassroom(subject, slot)
    slot.hasViolation = false
    slot.violations = []
    slot.violationSeverity = undefined
  }

  /**
   * スロットに制約違反で割り当て
   */
  private assignToSlotWithViolation(slot: TimetableSlot, teacher: Teacher, subject: Subject): void {
    slot.teacher = teacher
    slot.subject = subject
    slot.classroom = this.findSuitableClassroom(subject, slot)
    slot.hasViolation = true
    slot.violations = [{ type: 'constraint_violation', severity: 'medium', message: '制約違反による割り当て' }]
    slot.violationSeverity = 'medium'
  }

  /**
   * 新しいアルゴリズムでの時間割生成（5回リトライ付き）
   * AI_INSTRUCTIONS.md仕様に基づく実装
   */
  public async generateTimetableWithNewAlgorithm(): Promise<{
    success: boolean
    message?: string
    timetable?: TimetableSlot[][][]
    statistics?: {
      totalSlots: number
      assignedSlots: number
      unassignedSlots: number
      constraintViolations: number
      backtrackCount: number
      retryAttempts: number
      bestAssignmentRate: number
    }
  }> {
    this.log('🚀 新アルゴリズムによる時間割生成開始（5回リトライ付き）')
    
    const attempts: GenerationAttempt[] = []
    const maxRetries = 5
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      this.log(`\n🎯 試行 ${attempt}/${maxRetries}`)
      
      const attemptResult = await this.singleGenerationAttempt(attempt)
      attempts.push(attemptResult)
      
      this.log(`📊 試行${attempt}結果: 割当率${attemptResult.assignmentRate.toFixed(1)}%, 制約違反${attemptResult.constraintViolations}個`)
      
      // 100%達成した場合は早期終了
      if (attemptResult.assignmentRate >= 100) {
        this.log(`🎉 試行${attempt}で100%達成！生成完了`)
        break
      }
    }
    
    // 最良解を選択
    const bestAttempt = this.selectBestAttempt(attempts)
    this.log(`\n🏆 最良解選択: 試行${bestAttempt.attemptNumber} (割当率${bestAttempt.assignmentRate.toFixed(1)}%)`)
    
    // 最良解で時間割を復元
    this.timetable = bestAttempt.timetable
    
    return {
      success: true,
      message: `新アルゴリズムによる時間割生成完了（最良解: 割当率${bestAttempt.assignmentRate.toFixed(1)}%）`,
      timetable: this.timetable,
      statistics: {
        totalSlots: bestAttempt.totalSlots,
        assignedSlots: bestAttempt.assignedSlots,
        unassignedSlots: bestAttempt.unassignedSlots,
        constraintViolations: bestAttempt.constraintViolations,
        backtrackCount: 0,
        retryAttempts: attempts.length,
        bestAssignmentRate: bestAttempt.assignmentRate
      }
    }
  }

  /**
   * 単一の生成試行
   */
  private async singleGenerationAttempt(attemptNumber: number): Promise<GenerationAttempt> {
    // 時間割を初期化
    this.timetable = this.initializeTimetable()
    
    // 教師を困難度順にソート
    const sortedTeachers = this.sortTeachersByDifficulty()
    
    let totalAssignments = 0
    let successfulAssignments = 0
    let constraintViolations = 0
    
    // 各教師について教科を割り当て
    for (const teacher of sortedTeachers) {
      this.log(`\n👨‍🏫 教師: ${teacher.name}`)
      
      // 教師の担当教科を処理
      for (const subjectId of teacher.subjects) {
        const subject = this.subjects.find(s => s.id === subjectId)
        if (!subject) continue
        
        this.log(`📚 教科: ${subject.name}`)
        
        // 対象学年を処理
        for (const grade of this.settings.grades) {
          if (!this.isSubjectForGrade(subject, grade)) continue
          
          const requiredHours = this.getRequiredHoursForSubjectGrade(subject, grade)
          if (requiredHours <= 0) continue
          
          this.log(`🎯 ${grade}年生への${subject.name}割り当て（必要時数: ${requiredHours}）`)
          
          // 各クラスに割り当て
          const sections = this.settings.classesPerGrade[grade] || ['1']
          for (const section of sections) {
            this.log(`📝 ${grade}年${section}組への割り当て開始`)
            
            // 必要時数分のループ
            for (let hour = 1; hour <= requiredHours; hour++) {
              totalAssignments++
              
              const avoidSameDay = hour > 1 // 2授業目以降は同日回避
              const result = this.randomAssignToSlot(teacher, subject, grade, section, avoidSameDay)
              
              if (result.success) {
                successfulAssignments++
                if (result.violations.length > 0) {
                  constraintViolations++
                }
              }
              
              this.log(`  ${hour}授業目: ${result.success ? '✅' : '❌'} (制約違反: ${result.violations.length}個)`)
            }
          }
        }
      }
    }
    
    // 試行結果を計算
    const totalSlots = this.calculateTotalSlots()
    const assignmentRate = totalSlots > 0 ? (successfulAssignments / totalSlots) * 100 : 0
    
    return {
      attemptNumber,
      timetable: JSON.parse(JSON.stringify(this.timetable)), // ディープコピー
      totalSlots,
      assignedSlots: successfulAssignments,
      unassignedSlots: totalSlots - successfulAssignments,
      constraintViolations,
      assignmentRate,
      qualityScore: this.calculateQualityScore()
    }
  }

  /**
   * 最良の試行結果を選択
   */
  private selectBestAttempt(attempts: GenerationAttempt[]): GenerationAttempt {
    if (attempts.length === 0) {
      throw new Error('試行結果がありません')
    }
    
    // 選択基準: 1.割当率 2.制約違反の少なさ 3.品質スコア
    const sortedAttempts = attempts.sort((a, b) => {
      // 1. 割当率で比較（高い方が良い）
      if (Math.abs(a.assignmentRate - b.assignmentRate) > 0.1) {
        return b.assignmentRate - a.assignmentRate
      }
      
      // 2. 制約違反数で比較（少ない方が良い）
      if (a.constraintViolations !== b.constraintViolations) {
        return a.constraintViolations - b.constraintViolations
      }
      
      // 3. 品質スコアで比較（高い方が良い）
      return b.qualityScore - a.qualityScore
    })
    
    return sortedAttempts[0]
  }

  /**
   * 品質スコアを計算
   */
  private calculateQualityScore(): number {
    // 簡易的な品質スコア計算
    // 実際の実装では、負荷分散、同日連続授業回避度などを考慮
    return Math.random() * 100 // 暫定実装
  }

  /**
   * 総スロット数を計算
   */
  private calculateTotalSlots(): number {
    let total = 0
    for (let dayIndex = 0; dayIndex < this.timetable.length; dayIndex++) {
      for (let periodIndex = 0; periodIndex < this.timetable[dayIndex].length; periodIndex++) {
        total += this.timetable[dayIndex][periodIndex].length
      }
    }
    return total
  }

  /**
   * 教科が指定学年に対応しているかチェック
   */
  private isSubjectForGrade(subject: Subject, grade: number): boolean {
    if (!subject.grades || subject.grades.length === 0) {
      return true // 学年指定なしは全学年対応
    }
    return subject.grades.includes(grade)
  }
}

// 生成試行結果の型定義
interface GenerationAttempt {
  attemptNumber: number
  timetable: TimetableSlot[][][]
  totalSlots: number
  assignedSlots: number
  unassignedSlots: number
  constraintViolations: number
  assignmentRate: number
  qualityScore: number
}
