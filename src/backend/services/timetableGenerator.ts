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
    this.settings = settings
    this.teachers = teachers
    this.subjects = subjects
    this.classrooms = classrooms
    this.debugMode = debugMode
    this.timetable = this.initializeTimetable()
    this.candidates = this.generateCandidates()
    this.constraints = this.initializeConstraints()
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
    const days = ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜']
    const timetable: TimetableSlot[][][] = []

    for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
      const day = days[dayIndex]
      timetable[dayIndex] = []

      const periodsForDay =
        day === '土曜' ? this.settings.saturdayPeriods : this.settings.dailyPeriods

      for (let period = 1; period <= periodsForDay; period++) {
        timetable[dayIndex][period - 1] = []

        for (const grade of this.settings.grades) {
          for (const section of this.settings.classesPerGrade[grade] || ['A']) {
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
    const candidates: AssignmentCandidate[] = []

    this.log('🔍 候補生成開始:', {
      教师数: this.teachers.length,
      教科数: this.subjects.length,
      学年: this.settings.grades,
      クラス設定: this.settings.classesPerGrade,
    })

    // デバッグ: クラス設定の詳細確認
    console.log('🏫 各学年のクラス詳細:')
    for (const grade of this.settings.grades) {
      const sections = this.settings.classesPerGrade[grade] || ['A']
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

        for (const grade of this.settings.grades) {
          this.log(`\n🎓 学年チェック: ${grade}年`)

          if (!this.canSubjectBeTeachedToGrade(subject, grade)) {
            this.log(`❌ ${subject.name}は${grade}年に対応していません`)
            continue
          }
          this.log(`✅ ${subject.name}は${grade}年に対応しています`)

          for (const section of this.settings.classesPerGrade[grade] || ['A']) {
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
  public async generateTimetable(options?: { tolerantMode?: boolean }): Promise<{
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
    this.log('🚀 プログラム型時間割生成を開始')
    if (options?.tolerantMode) {
      this.log('🟡 寛容モードで生成します（制約違反も記録）')
    }

    const startTime = Date.now()
    const backtrackCount = 0
    const maxExecutionTime = 30000 // 30秒制限

    // 困難度に従って割当候補をソート（困難な教師を優先）
    const sortedCandidates = this.sortCandidatesByDifficulty()

    // バックトラッキング実行（時間制限付き）
    const result = await this.backtrack(
      sortedCandidates,
      0,
      backtrackCount,
      startTime,
      maxExecutionTime,
      options?.tolerantMode || false
    )

    const endTime = Date.now()
    const duration = endTime - startTime

    this.log(`⏱️ 生成時間: ${duration}ms`)
    this.log(`🔄 バックトラック回数: ${backtrackCount}`)

    if (result.success) {
      const stats = this.calculateStatistics()
      return {
        success: true,
        timetable: this.timetable,
        statistics: { ...stats, backtrackCount: result.backtrackCount },
      }
    } else {
      // 部分解でも返す（パフォーマンス改善）
      const stats = this.calculateStatistics()
      return {
        success: stats.assignedSlots > 0, // 何らかの割当があれば部分成功
        timetable: this.timetable,
        message: result.timeout
          ? `時間制限により部分解を返します（${duration}ms、バックトラック回数: ${result.backtrackCount}）`
          : `時間割生成に失敗しました（バックトラック回数: ${result.backtrackCount}）`,
        statistics: { ...stats, backtrackCount: result.backtrackCount },
      }
    }
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
          candidateIndex,
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
    const dayIndex = ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜'].indexOf(day)
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
    const dayIndex = ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜'].indexOf(slot.day)
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
}
