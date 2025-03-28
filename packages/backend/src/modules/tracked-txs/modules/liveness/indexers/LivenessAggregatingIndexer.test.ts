import { Logger } from '@l2beat/backend-tools'
import type {
  AggregatedLivenessRecord,
  Database,
  LivenessRecord,
} from '@l2beat/database'
import { type TrackedTxConfigEntry, createTrackedTxId } from '@l2beat/shared'
import { ProjectId, UnixTime } from '@l2beat/shared-pure'
import { expect, mockFn, mockObject } from 'earl'
import type { TrackedTxProject } from '../../../../../config/Config'
import type { IndexerService } from '../../../../../tools/uif/IndexerService'
import type { SavedConfiguration } from '../../../../../tools/uif/multi/types'
import { LivenessAggregatingIndexer } from './LivenessAggregatingIndexer'

const NOW = UnixTime.now()
const MIN = NOW - 100 * UnixTime.DAY

const MOCK_CONFIGURATION_ID = createTrackedTxId.random()
const MOCK_CONFIGURATION_TYPE = 'batchSubmissions'

const MOCK_PROJECTS: TrackedTxProject[] = [
  {
    id: ProjectId('mocked-project'),
    isArchived: false,
    configurations: [
      mockObject<TrackedTxConfigEntry>({
        id: MOCK_CONFIGURATION_ID,
        type: 'liveness',
        subtype: MOCK_CONFIGURATION_TYPE,
        untilTimestamp: UnixTime.now(),
      }),
    ],
  },
]

const MOCK_CONFIGURATIONS = [
  mockObject<Omit<SavedConfiguration<TrackedTxConfigEntry>, 'properties'>>({
    id: MOCK_CONFIGURATION_ID,
    maxHeight: null,
    currentHeight: 1,
  }),
]

const MOCK_LIVENESS: LivenessRecord[] = [
  mockObject<LivenessRecord>({
    configurationId: MOCK_CONFIGURATION_ID,
    timestamp: NOW - 1 * UnixTime.HOUR,
  }),
  mockObject<LivenessRecord>({
    configurationId: MOCK_CONFIGURATION_ID,
    timestamp: NOW - 3 * UnixTime.HOUR,
  }),
  mockObject<LivenessRecord>({
    configurationId: MOCK_CONFIGURATION_ID,
    timestamp: NOW - 7 * UnixTime.HOUR,
  }),
]

describe(LivenessAggregatingIndexer.name, () => {
  describe(LivenessAggregatingIndexer.prototype.update.name, () => {
    it('should return parent safe height if not enough data', async () => {
      const indexer = createIndexer({ tag: 'update-return' })
      const mockGenerateLiveness = mockFn().resolvesTo([])
      indexer.generateLiveness = mockGenerateLiveness

      const safeHeigh = MIN
      const parentSafeHeight = NOW - 2 * UnixTime.DAY

      const result = await indexer.update(safeHeigh, parentSafeHeight)

      expect(mockGenerateLiveness).not.toHaveBeenCalled()

      expect(result).toEqual(parentSafeHeight)
    })

    it('should skip if already up to date', async () => {
      const indexer = createIndexer({ tag: 'update-skip' })
      const mockGenerateLiveness = mockFn().resolvesTo([])
      indexer.generateLiveness = mockGenerateLiveness

      const safeHeight = NOW - 2 * UnixTime.HOUR
      const parentSafeHeight = NOW - 1 * UnixTime.HOUR

      const result = await indexer.update(safeHeight, parentSafeHeight)

      expect(mockGenerateLiveness).not.toHaveBeenCalled()

      expect(result).toEqual(parentSafeHeight)
    })

    it('should adjust target height and generate liveness data', async () => {
      const mockLivenessRepository = mockObject<Database['aggregatedLiveness']>(
        {
          upsertMany: mockFn().resolvesTo(1),
        },
      )

      const indexer = createIndexer({
        tag: 'update',
        aggregatedLivenessRepository: mockLivenessRepository,
      })
      const mockLiveness: AggregatedLivenessRecord[] = [
        {
          projectId: MOCK_PROJECTS[0].id,
          subtype: 'batchSubmissions',
          range: '30D',
          min: 10,
          avg: 20,
          max: 30,
          updatedAt: NOW,
        },
      ]

      const mockGenerateLiveness = mockFn().resolvesTo(mockLiveness)
      indexer.generateLiveness = mockGenerateLiveness

      const safeHeight = NOW - 4 * UnixTime.DAY
      const parentSafeHeight = NOW - 1 * UnixTime.HOUR

      const result = await indexer.update(safeHeight, parentSafeHeight)

      expect(mockGenerateLiveness).toHaveBeenCalledWith(
        UnixTime.toStartOf(NOW, 'day') - 1,
      )

      expect(mockLivenessRepository.upsertMany).toHaveBeenCalledWith(
        mockLiveness,
      )

      expect(result).toEqual(parentSafeHeight)
    })
  })

  describe(LivenessAggregatingIndexer.prototype.invalidate.name, () => {
    it('should return new safeHeigh and not delete data', async () => {
      const livenessRepositoryMock = mockObject<Database['liveness']>({
        deleteAll: mockFn().resolvesTo(1),
      })

      const targetHeight = UnixTime.now()

      const indexer = createIndexer({
        tag: 'invalidate',
        livenessRepository: livenessRepositoryMock,
      })

      const result = await indexer.invalidate(targetHeight)

      expect(livenessRepositoryMock.deleteAll).not.toHaveBeenCalled()

      expect(result).toEqual(targetHeight)
    })
  })

  describe(LivenessAggregatingIndexer.prototype.generateLiveness.name, () => {
    it('should generate aggregated liveness', async () => {
      const mockLivenessRepository = mockObject<Database['liveness']>({
        getByConfigurationIdUpTo: mockFn().resolvesTo(MOCK_LIVENESS),
      })

      const mockIndexerService = mockObject<IndexerService>({
        getSavedConfigurations: mockFn().resolvesTo(MOCK_CONFIGURATIONS),
      })

      const indexer = createIndexer({
        tag: 'generateLiveness',
        livenessRepository: mockLivenessRepository,
        indexerService: mockIndexerService,
      })

      const result = await indexer.generateLiveness(NOW)

      expect(
        mockLivenessRepository.getByConfigurationIdUpTo,
      ).toHaveBeenCalledWith([MOCK_CONFIGURATION_ID], NOW)

      expect(result).toEqual([
        {
          avg: 10800,
          max: 14400,
          min: 7200,
          projectId: 'mocked-project',
          range: '30D',
          subtype: 'batchSubmissions',
          updatedAt: NOW,
        },
        {
          avg: 10800,
          max: 14400,
          min: 7200,
          projectId: 'mocked-project',
          range: '90D',
          subtype: 'batchSubmissions',
          updatedAt: NOW,
        },
        {
          avg: 10800,
          max: 14400,
          min: 7200,
          projectId: 'mocked-project',
          range: 'MAX',
          subtype: 'batchSubmissions',
          updatedAt: NOW,
        },
      ])
    })
  })

  describe(LivenessAggregatingIndexer.prototype.aggregatedRecords.name, () => {
    it('should aggregate records', async () => {
      const indexer = createIndexer({ tag: 'aggregatedRecords' })

      const result = indexer.aggregatedRecords(
        MOCK_PROJECTS[0].id,
        'batchSubmissions',
        MOCK_LIVENESS.map((record) => ({
          ...record,
          id: MOCK_CONFIGURATION_ID,
          subtype: MOCK_CONFIGURATION_TYPE,
        })),
        NOW,
        ['30D'],
      )

      expect(result).toEqual([
        {
          avg: 10800,
          max: 14400,
          min: 7200,
          projectId: 'mocked-project',
          range: '30D',
          subtype: 'batchSubmissions',
          updatedAt: NOW,
        },
      ])
    })
  })
})

function createIndexer(options: {
  tag: string
  livenessRepository?: Database['liveness']
  aggregatedLivenessRepository?: Database['aggregatedLiveness']
  indexerService?: IndexerService
}) {
  return new LivenessAggregatingIndexer({
    tags: { tag: options.tag },
    indexerService: options.indexerService ?? mockObject<IndexerService>(),
    logger: Logger.SILENT,
    minHeight: 0,
    parents: [],
    db: mockObject<Database>({
      liveness:
        options.livenessRepository ?? mockObject<Database['liveness']>(),
      aggregatedLiveness:
        options.aggregatedLivenessRepository ??
        mockObject<Database['aggregatedLiveness']>({
          upsertMany: mockFn().resolvesTo(1),
        }),
    }),
    projects: MOCK_PROJECTS,
  })
}
