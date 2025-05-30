import { RoundedWarningIcon } from '~/icons/rounded-warning'
import { cn } from '~/utils/cn'
import { UpcomingBadge } from '../../badge/upcoming-badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../core/tooltip/tooltip'
import { SentimentText } from '../../sentiment-text'
import { WarningBar, sentimentToWarningBarColor } from '../../warning-bar'
import {
  RosetteTooltipContextProvider,
  useRosetteTooltipContext,
} from '../rosette-tooltip-context'
import type { RosetteValue } from '../types'
import { PizzaRosetteIcon } from './pizza-rosette-icon'
import { PizzaRosetteLabels } from './pizza-rosette-labels'
import { RealPizzaRosetteIcon } from './real-pizza-rosette-icon'

export interface BigPizzaRosetteProps {
  values: RosetteValue[]
  isUpcoming?: boolean
  isUnderReview?: boolean
  className?: string
  background?: 'header' | 'surface'
  realPizza?: boolean
}

export function BigPizzaRosette(props: BigPizzaRosetteProps) {
  const PizzaComponent = props.realPizza
    ? RealPizzaRosetteIcon
    : PizzaRosetteIcon

  const isUnderReview =
    !!props.isUnderReview ||
    Object.values(props.values).some(
      ({ sentiment }) => sentiment === 'UnderReview',
    )

  if (isUnderReview || props.isUpcoming) {
    return (
      <div
        className={cn(
          'relative h-[284px] w-[272px] whitespace-pre p-12 text-center text-xs font-medium uppercase leading-tight',
          props.className,
        )}
      >
        <PizzaComponent
          values={props.values}
          isUnderReview={isUnderReview}
          className={cn(props.isUpcoming && 'opacity-30')}
          background={props.background}
        />
        {props.isUpcoming && (
          <UpcomingBadge className="absolute left-[90px] top-[130px]" />
        )}
        <PizzaRosetteLabels
          values={props.values}
          containerSize={272}
          textRadius={102}
        />
      </div>
    )
  }

  return (
    <RosetteTooltipContextProvider>
      <Tooltip>
        <div
          className={cn('relative w-[272px] p-12', props.className)}
          data-rosette-hover-disabled={isUnderReview || props.isUpcoming}
        >
          <TooltipTrigger>
            <PizzaComponent
              values={props.values}
              isUnderReview={isUnderReview}
              background={props.background}
            />
          </TooltipTrigger>
          <PizzaRosetteLabels
            values={props.values}
            containerSize={272}
            textRadius={102}
          />
        </div>
        <RosetteTooltipContent />
      </Tooltip>
    </RosetteTooltipContextProvider>
  )
}

function RosetteTooltipContent() {
  const context = useRosetteTooltipContext()
  const selectedRisk = context?.selectedRisk
  if (!selectedRisk) return null

  return (
    <TooltipContent
      side="bottom"
      onPointerDownOutside={(e) => {
        e.preventDefault()
      }}
      className="w-[300px]"
    >
      <p className="label-value-14-medium mb-2">{selectedRisk.name}</p>
      <SentimentText
        sentiment={selectedRisk.sentiment ?? 'neutral'}
        vibrant={true}
        className="heading-18 mb-2 flex items-center gap-1"
      >
        {selectedRisk.value}
      </SentimentText>
      {selectedRisk.warning && (
        <WarningBar
          className="mb-2 px-3 py-2"
          icon={RoundedWarningIcon}
          text={selectedRisk.warning.value}
          color={sentimentToWarningBarColor(selectedRisk.warning.sentiment)}
          ignoreMarkdown
        />
      )}
      <span>{selectedRisk.description}</span>
    </TooltipContent>
  )
}
