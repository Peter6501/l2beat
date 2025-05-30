import type { Project } from '@l2beat/config'
import { notUndefined } from '@l2beat/shared-pure'
import { getTechnologyChoicesSectionProps } from './get-technology-choices-section-props'
import { makeTechnologyChoice } from './make-technology-section'

export function getOperatorSection(
  project: Project<'statuses' | 'scalingTechnology'>,
) {
  const items = [
    project.scalingTechnology.operator &&
      makeTechnologyChoice('operator', project.scalingTechnology.operator),
    project.scalingTechnology.forceTransactions &&
      makeTechnologyChoice(
        'force-transactions',
        project.scalingTechnology.forceTransactions,
      ),
  ].filter(notUndefined)

  return getTechnologyChoicesSectionProps(project, items)
}
