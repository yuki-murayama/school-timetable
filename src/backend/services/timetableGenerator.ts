/**
 * 時間割生成サービス（リファクタリング版）
 * ファサードパターンによる統合インターフェース
 */

import type {
  Classroom,
  SchoolSettings,
  Subject,
  Teacher,
  TimetableGenerationResult,
  TimetableSlot,
} from '../../shared/types'

import {
  type AssignmentCandidate,
  AssignmentRestrictionChecker,
  ClassroomConflictChecker,
  type ConstraintAnalysis,
  createLogger,
  shuffleArray,
  TeacherConflictChecker,
  TimetableAnalyzer,
  TimetableAssigner,
  TimetableConfiguration,
  TimetableInitializer,
  type TimetableValidationResult,
  TimetableValidator,
} from './timetable'

export class TimetableGenerator {
  // コア機能クラス群
  private config: TimetableConfiguration
  private initializer: TimetableInitializer
  private assigner: TimetableAssigner
  private validator: TimetableValidator
  private analyzer: TimetableAnalyzer
  private log: (...args: unknown[]) => void

  // データ
  private teachers: Teacher[]
  private subjects: Subject[]
  private classrooms: Classroom[]
  private timetable: TimetableSlot[][][]
  private candidates: AssignmentCandidate[]

  constructor(
    settings: SchoolSettings,
    teachers: Teacher[],
    subjects: Subject[],
    classrooms: Classroom[],
    debugMode: boolean = false
  ) {
    this.teachers = teachers
    this.subjects = subjects
    this.classrooms = classrooms
    this.log = createLogger(debugMode)

    // 機能クラス初期化
    this.config = new TimetableConfiguration(settings)
    this.initializer = new TimetableInitializer(
      this.config.getSettings(),
      teachers,
      subjects,
      classrooms
    )

    // 制約チェッカー初期化
    const constraints = [
      new TeacherConflictChecker(),
      new ClassroomConflictChecker(),
      new AssignmentRestrictionChecker(),
    ]

    this.assigner = new TimetableAssigner(classrooms, constraints, this.log)
    this.validator = new TimetableValidator(constraints, this.log)
    this.analyzer = new TimetableAnalyzer(this.log)

    // 初期化
    this.timetable = this.initializer.initializeTimetable()
    this.candidates = this.initializer.generateCandidates()
  }

  /**
   * メイン生成メソッド（API互換性維持）
   */
  public async generateTimetable(options?: {
    tolerantMode?: boolean
    useNewAlgorithm?: boolean
  }): Promise<TimetableGenerationResult> {
    this.log('🚀 時間割生成開始（新アルゴリズム版）')

    try {
      // 新しい仕様に基づくアルゴリズムを使用
      const result = await this.executeAdvancedAssignment(options?.tolerantMode || false)

      const statistics = this.analyzer.calculateStatistics(this.timetable)
      const assignmentRate = this.analyzer.calculateAssignmentRate(this.timetable)

      this.log(`✅ 時間割生成完了: 割当率 ${assignmentRate}%`)

      return {
        success: true,
        message: `時間割生成が完了しました（割当率: ${assignmentRate}%、リトライ回数: ${result.retryCount}）`,
        timetable: this.timetable,
        statistics: {
          assignmentRate,
          retryCount: result.retryCount,
          bestRate: result.bestRate,
          ...statistics,
        },
      }
    } catch (error) {
      this.log('❌ 時間割生成エラー:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : '時間割生成に失敗しました',
      }
    }
  }

  /**
   * バリデーション実行
   */
  public validateTimetable(): TimetableValidationResult {
    const violations = this.validator.findConstraintViolations(this.timetable)
    const qualityMetrics = this.analyzer.calculateQualityMetrics(
      this.timetable,
      this.teachers,
      this.candidates
    )
    const unassignedRequirements = this.analyzer.analyzeUnassignedRequirements(this.candidates)
    const overallScore = this.analyzer.calculateOverallScore(qualityMetrics, violations)

    return {
      isValid: violations.filter(v => v.severity === 'critical').length === 0,
      overallScore,
      violations,
      qualityMetrics,
      unassignedRequirements,
      improvementSuggestions: [], // 簡易実装
    }
  }

  /**
   * 制約分析実行
   */
  public getConstraintAnalysis(): ConstraintAnalysis {
    const teacherDifficulties = this.analyzer.calculateTeacherDifficulties(
      this.teachers,
      this.subjects,
      this.candidates
    )

    return {
      constraintStats: {
        teacherConflicts: 0,
        classroomConflicts: 0,
        assignmentRestrictions: 0,
        totalChecks: 0,
      },
      candidateAnalysis: [],
      teacherDifficulties,
      optimizationRecommendations: [],
    }
  }

  /**
   * シンプルな割当アルゴリズム（互換性維持）
   */
  private async executeSimpleAssignment(): Promise<{ success: boolean }> {
    const shuffledCandidates = shuffleArray(this.candidates)

    for (const candidate of shuffledCandidates) {
      let assignedHours = 0
      const availableSlots = this.assigner.findAvailableSlots(
        candidate,
        this.timetable,
        this.config.getSafeDays()
      )

      for (const slot of availableSlots) {
        if (assignedHours >= candidate.requiredHours) break

        const result = this.assigner.tryAssignToSlot(slot, candidate, this.timetable)
        if (result.success) {
          assignedHours++
          candidate.assignedHours++
        }
      }
    }

    return { success: true }
  }

  /**
   * 新仕様に基づく高度な時間割生成アルゴリズム
   */
  private async executeAdvancedAssignment(tolerantMode: boolean): Promise<{
    success: boolean
    retryCount: number
    bestRate: number
  }> {
    let bestTimetable: TimetableSlot[][][] | null = null
    let bestRate = 0
    let retryCount = 0
    const MAX_RETRIES = 5

    this.log('🎯 新仕様アルゴリズム開始: 割当困難度順・ランダム配置・制約違反許容')

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      retryCount = attempt + 1
      this.log(`🔄 リトライ ${retryCount}/${MAX_RETRIES}`)

      // 時間割を初期化
      this.timetable = this.initializer.initializeTimetable()
      this.candidates = this.initializer.generateCandidates()

      // 1. 割当困難度の高い教師から処理
      const sortedTeachers = this.sortTeachersByDifficulty()
      
      for (const teacher of sortedTeachers) {
        await this.assignTeacherSubjects(teacher, tolerantMode)
      }

      // 2. 未割当教科を制約違反でも保存
      await this.assignRemainingWithViolations()

      // 3. 割当成功率を計算
      const currentRate = this.analyzer.calculateAssignmentRate(this.timetable)
      this.log(`📊 リトライ ${retryCount} 結果: 割当率 ${currentRate}%`)

      if (currentRate > bestRate) {
        bestRate = currentRate
        bestTimetable = JSON.parse(JSON.stringify(this.timetable)) // ディープコピー
      }

      // 100%達成で完了
      if (currentRate >= 100) {
        this.log('🎉 100%割当達成!')
        break
      }
    }

    // 最良の結果を使用
    if (bestTimetable) {
      this.timetable = bestTimetable
      this.log(`✨ 最良結果採用: 割当率 ${bestRate}%`)
    }

    return {
      success: true,
      retryCount,
      bestRate,
    }
  }

  /**
   * 割当困難度計算による教師ソート
   * ※1の計算式: (担当教科の授業時数/担当教科の教師数) / 教師の割当可能時間数
   */
  private sortTeachersByDifficulty(): Teacher[] {
    const teacherDifficulties = this.teachers.map(teacher => {
      const difficulty = this.calculateTeacherDifficulty(teacher)
      return { teacher, difficulty }
    })

    // 困難度の高い順でソート
    teacherDifficulties.sort((a, b) => b.difficulty - a.difficulty)
    
    this.log(`🎯 教師割当困難度順:`)
    teacherDifficulties.forEach((item, index) => {
      this.log(`${index + 1}. ${item.teacher.name}: 困難度 ${item.difficulty.toFixed(3)}`)
    })

    return teacherDifficulties.map(item => item.teacher)
  }

  /**
   * 教師の割当困難度を計算
   */
  private calculateTeacherDifficulty(teacher: Teacher): number {
    if (!teacher.subjects.length) return 0

    const settings = this.config.getSettings()
    
    // 教師の割当可能時間数を計算
    const totalPossibleSlots = (settings.dailyPeriods * 5) + settings.saturdayPeriods
    const restrictedSlots = teacher.assignmentRestrictions?.reduce((total, restriction) => {
      return total + (restriction.restrictionLevel === '必須' ? restriction.restrictedPeriods.length : 0)
    }, 0) || 0
    
    const availableSlots = totalPossibleSlots - restrictedSlots

    if (availableSlots <= 0) return Infinity

    // 各担当教科の困難度を計算して合計
    let totalDifficulty = 0
    
    for (const subjectName of teacher.subjects) {
      const subject = this.subjects.find(s => s.name === subjectName)
      if (!subject) continue

      // その教科を担当する教師数
      const teachersForSubject = this.teachers.filter(t => t.subjects.includes(subjectName)).length
      
      if (teachersForSubject === 0) continue

      // その教科の総授業時数を計算
      const totalHoursForSubject = subject.grades.reduce((total, grade) => {
        const gradeSettings = this.config.getGradeSettings(grade)
        return total + (gradeSettings.classes * subject.weeklyHours)
      }, 0)

      // この教科での困難度: (授業時数/教師数)
      const subjectDifficulty = totalHoursForSubject / teachersForSubject
      totalDifficulty += subjectDifficulty
    }

    // 最終的な困難度: 総困難度 / 利用可能時間数
    return totalDifficulty / availableSlots
  }

  /**
   * 教師の担当教科を割当
   */
  private async assignTeacherSubjects(teacher: Teacher, tolerantMode: boolean): Promise<void> {
    this.log(`👨‍🏫 教師 ${teacher.name} の教科割当開始`)

    for (const subjectName of teacher.subjects) {
      const subject = this.subjects.find(s => s.name === subjectName)
      if (!subject) continue

      this.log(`📚 教科 ${subject.name} の割当処理`)

      // 教科の各学年について処理
      for (const grade of subject.grades) {
        const gradeSettings = this.config.getGradeSettings(grade)
        
        // 各クラスに授業時数分割当
        for (let classIndex = 1; classIndex <= gradeSettings.classes; classIndex++) {
          await this.assignSubjectToClass(teacher, subject, grade, classIndex, tolerantMode)
        }
      }
    }
  }

  /**
   * 特定のクラスに教科を割当（ランダム配置・同日回避）
   */
  private async assignSubjectToClass(
    teacher: Teacher, 
    subject: Subject, 
    grade: number, 
    classIndex: number, 
    tolerantMode: boolean
  ): Promise<void> {
    const candidate: AssignmentCandidate = {
      teacher,
      subject,
      grade,
      classIndex,
      requiredHours: subject.weeklyHours,
      assignedHours: 0,
    }

    let assignedHours = 0
    const assignedDays: number[] = [] // 既に割当済みの曜日を記録

    for (let hour = 0; hour < subject.weeklyHours; hour++) {
      const availableSlots = this.getAvailableSlotsForAssignment(candidate, assignedDays)
      
      if (availableSlots.length === 0) {
        if (tolerantMode) {
          this.log(`⚠️ ${subject.name} ${grade}年${classIndex}組 ${hour + 1}時限目: 制約違反で強制割当`)
          await this.forceAssignWithViolation(candidate)
        } else {
          this.log(`❌ ${subject.name} ${grade}年${classIndex}組 ${hour + 1}時限目: 割当不能`)
        }
        continue
      }

      // ランダム選択
      const randomSlot = availableSlots[Math.floor(Math.random() * availableSlots.length)]
      
      // スロット情報から実際のTimetableSlotを作成して割当
      const success = this.assignToTimetableSlot(randomSlot, candidate)
      
      if (success) {
        assignedHours++
        assignedDays.push(randomSlot.day)
        this.log(`✅ ${subject.name} ${grade}年${classIndex}組: ${randomSlot.day}曜日${randomSlot.period}時限目に割当成功`)
      }
    }

    this.log(`📋 ${subject.name} ${grade}年${classIndex}組 割当結果: ${assignedHours}/${subject.weeklyHours}`)
  }

  /**
   * 割当可能スロットを取得（同日回避ロジック付き）
   */
  private getAvailableSlotsForAssignment(
    candidate: AssignmentCandidate, 
    assignedDays: number[]
  ): Array<{ day: number; period: number }> {
    const settings = this.config.getSettings()
    const availableSlots: Array<{ day: number; period: number }> = []

    // 全時間枠をチェック
    for (let day = 0; day < 6; day++) { // 月〜土
      const maxPeriods = day === 5 ? settings.saturdayPeriods : settings.dailyPeriods
      
      for (let period = 0; period < maxPeriods; period++) {
        // 対象クラスのスロットをチェック
        const slotIndex = day * settings.dailyPeriods + period
        const slot = this.timetable[candidate.grade - 1][candidate.classIndex - 1][slotIndex]
        
        // 空いているスロット且つ教師の制約に違反しない
        if (!slot && this.isTeacherAvailable(candidate.teacher, day, period)) {
          // 同日回避: 既に割当済みの曜日をチェック
          if (assignedDays.length === 0 || !assignedDays.includes(day)) {
            availableSlots.push({ day, period })
          }
        }
      }
    }

    // 同日回避ができない場合は同日も含めて再度チェック
    if (availableSlots.length === 0 && assignedDays.length > 0) {
      for (let day = 0; day < 6; day++) {
        const maxPeriods = day === 5 ? settings.saturdayPeriods : settings.dailyPeriods
        
        for (let period = 0; period < maxPeriods; period++) {
          const slotIndex = day * settings.dailyPeriods + period
          const slot = this.timetable[candidate.grade - 1][candidate.classIndex - 1][slotIndex]
          
          if (!slot && this.isTeacherAvailable(candidate.teacher, day, period)) {
            availableSlots.push({ day, period })
          }
        }
      }
    }

    return availableSlots
  }

  /**
   * 教師が指定時間に利用可能かチェック
   */
  private isTeacherAvailable(teacher: Teacher, day: number, period: number): boolean {
    const dayNames = ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜']
    const dayName = dayNames[day]

    // 教師の割当制限をチェック
    if (teacher.assignmentRestrictions) {
      for (const restriction of teacher.assignmentRestrictions) {
        if (
          restriction.restrictedDay === dayName &&
          restriction.restrictionLevel === '必須' &&
          restriction.restrictedPeriods.includes(period + 1)
        ) {
          return false
        }
      }
    }

    // 既に同じ時間に割り当て済みかチェック
    for (let grade = 1; grade <= 3; grade++) {
      const gradeSettings = this.config.getGradeSettings(grade)
      for (let classIndex = 1; classIndex <= gradeSettings.classes; classIndex++) {
        const settings = this.config.getSettings()
        const slotIndex = day * settings.dailyPeriods + period
        const slot = this.timetable[grade - 1][classIndex - 1][slotIndex]
        if (slot && slot.teacher && slot.teacher.id === teacher.id) {
          return false
        }
      }
    }

    return true
  }

  /**
   * 時間割スロットに割当実行
   */
  private assignToTimetableSlot(
    slotInfo: { day: number; period: number }, 
    candidate: AssignmentCandidate
  ): boolean {
    const settings = this.config.getSettings()
    const slotIndex = slotInfo.day * settings.dailyPeriods + slotInfo.period
    
    // 対象スロットに割当
    this.timetable[candidate.grade - 1][candidate.classIndex - 1][slotIndex] = {
      classGrade: candidate.grade,
      classSection: String(candidate.classIndex),
      day: slotInfo.day.toString(),
      period: slotInfo.period,
      teacher: candidate.teacher,
      subject: candidate.subject,
      classroom: null, // 簡略化のため教室は割り当てない
    }
    
    return true
  }

  /**
   * 制約違反でも強制割当
   */
  private async forceAssignWithViolation(candidate: AssignmentCandidate): Promise<void> {
    const settings = this.config.getSettings()
    
    // 全ての時間枠から空いているスロットを探す
    for (let day = 0; day < 6; day++) { // 月〜土
      const maxPeriods = day === 5 ? settings.saturdayPeriods : settings.dailyPeriods
      
      for (let period = 0; period < maxPeriods; period++) {
        const slot = this.timetable[candidate.grade - 1][candidate.classIndex - 1][day * maxPeriods + period]
        
        if (!slot) {
          // 空きスロットに制約違反フラグ付きで割当
          this.timetable[candidate.grade - 1][candidate.classIndex - 1][day * maxPeriods + period] = {
            teacher: candidate.teacher,
            subject: candidate.subject,
            classroom: null,
            isViolation: true, // 制約違反フラグ
          }
          return
        }
      }
    }
  }

  /**
   * 未割当教科を制約違反でも保存
   */
  private async assignRemainingWithViolations(): Promise<void> {
    this.log('🔧 未割当教科の制約違反割当処理')

    for (const candidate of this.candidates) {
      if (candidate.assignedHours < candidate.requiredHours) {
        const remaining = candidate.requiredHours - candidate.assignedHours
        this.log(`⚠️ ${candidate.subject.name} ${candidate.grade}年${candidate.classIndex}組: ${remaining}時間未割当`)
        
        for (let i = 0; i < remaining; i++) {
          await this.forceAssignWithViolation(candidate)
        }
      }
    }
  }

  /**
   * 統計取得（互換性）
   */
  public getStatistics() {
    return this.analyzer.calculateStatistics(this.timetable)
  }

  /**
   * 時間割データ取得
   */
  public getTimetable(): TimetableSlot[][][] {
    return this.timetable
  }
}
