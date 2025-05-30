import type {
  Project,
  ProjectScalingCategory,
  ProjectScalingStack,
} from '@l2beat/config'
import type { RosetteValue } from '~/components/rosette/types'
import { getL2Risks } from '~/pages/scaling/utils/get-l2-risks'
import { groupByScalingTabs } from '~/pages/scaling/utils/group-by-scaling-tabs'
import { ps } from '~/server/projects'
import type { ProjectChanges } from '../../projects-change-report/get-projects-change-report'
import { getProjectsChangeReport } from '../../projects-change-report/get-projects-change-report'
import type { CommonScalingEntry } from '../get-common-scaling-entry'
import { getCommonScalingEntry } from '../get-common-scaling-entry'
import { get7dTvsBreakdown } from '../tvs/get-7d-tvs-breakdown'
import type { ProjectSevenDayTvsBreakdown } from '../tvs/get-7d-tvs-breakdown'
import { compareTvs } from '../tvs/utils/compare-tvs'

export async function getScalingArchivedEntries() {
  const [projectsChangeReport, tvs, projects] = await Promise.all([
    getProjectsChangeReport(),
    get7dTvsBreakdown({ type: 'layer2' }),
    ps.getProjects({
      select: ['statuses', 'scalingInfo', 'scalingRisks', 'display'],
      where: ['isScaling', 'archivedAt'],
    }),
  ])

  const entries = projects.map((project) =>
    getScalingArchivedEntry(
      project,
      projectsChangeReport.getChanges(project.id),
      tvs.projects[project.id.toString()],
    ),
  )

  return groupByScalingTabs(entries.sort(compareTvs))
}

export interface ScalingArchivedEntry extends CommonScalingEntry {
  category: ProjectScalingCategory
  purposes: string[]
  stack: ProjectScalingStack | undefined
  risks: RosetteValue[] | undefined
  totalTvs: number | undefined
  tvsOrder: number
}

function getScalingArchivedEntry(
  project: Project<'scalingInfo' | 'statuses' | 'scalingRisks' | 'display'>,
  changes: ProjectChanges,
  latestTvs: ProjectSevenDayTvsBreakdown | undefined,
): ScalingArchivedEntry {
  return {
    ...getCommonScalingEntry({ project, changes }),
    category: project.scalingInfo.type,
    purposes: project.scalingInfo.purposes,
    stack: project.scalingInfo.stack,
    risks: getL2Risks(
      project.scalingRisks.stacked ?? project.scalingRisks.self,
    ),
    totalTvs: latestTvs?.breakdown.total,
    tvsOrder: latestTvs?.breakdown.total ?? -1,
  }
}
