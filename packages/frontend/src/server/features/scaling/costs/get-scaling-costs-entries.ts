import type { Project, WarningWithSentiment } from '@l2beat/config'
import { groupByScalingTabs } from '~/pages/scaling/utils/group-by-scaling-tabs'
import { ps } from '~/server/projects'
import { api } from '~/trpc/server'
import {
  type ProjectChanges,
  getProjectsChangeReport,
} from '../../projects-change-report/get-projects-change-report'
import {
  type CommonScalingEntry,
  getCommonScalingEntry,
} from '../get-common-scaling-entry'
import type { CostsTableData } from './get-costs-table-data'
import { compareStageAndCost } from './utils/compare-stage-and-cost'

export async function getScalingCostsEntries() {
  const [projectsChangeReport, projects, costs] = await Promise.all([
    getProjectsChangeReport(),
    ps.getProjects({
      select: ['statuses', 'scalingInfo', 'costsInfo', 'display'],
      where: ['isScaling'],
      whereNot: ['isUpcoming', 'archivedAt'],
    }),
    api.costs.table({ range: '30d' }),
  ])

  const entries = projects
    .map((project) =>
      getScalingCostEntry(
        project,
        projectsChangeReport.getChanges(project.id),
        costs[project.id],
      ),
    )
    .sort(compareStageAndCost)
  return groupByScalingTabs(entries)
}

export interface ScalingCostsEntry extends CommonScalingEntry {
  costsWarning: WarningWithSentiment | undefined
  costOrder: number
}

function getScalingCostEntry(
  project: Project<'statuses' | 'scalingInfo' | 'costsInfo' | 'display'>,
  changes: ProjectChanges,
  costs: CostsTableData[string] | undefined,
): ScalingCostsEntry {
  const costPerUop =
    costs?.uopsCount && costs.usd.total
      ? costs.usd.total / costs.uopsCount
      : Infinity

  return {
    ...getCommonScalingEntry({ project, changes }),
    costsWarning: project.costsInfo.warning,
    costOrder: costPerUop,
  }
}
