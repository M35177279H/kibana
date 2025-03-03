/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chunk from 'lodash/fp/chunk';
import { getThreatList, getThreatListCount } from './get_threat_list';

import { CreateThreatSignalsOptions } from './types';
import { createThreatSignal } from './create_threat_signal';
import { SearchAfterAndBulkCreateReturnType } from '../types';
import { buildExecutionIntervalValidator, combineConcurrentResults } from './utils';
import { buildThreatEnrichment } from './build_threat_enrichment';

export const createThreatSignals = async ({
  alertId,
  buildRuleMessage,
  bulkCreate,
  completeRule,
  concurrentSearches,
  eventsTelemetry,
  exceptionItems,
  filters,
  inputIndex,
  itemsPerSearch,
  language,
  listClient,
  logger,
  outputIndex,
  query,
  savedId,
  searchAfterSize,
  services,
  threatFilters,
  threatIndex,
  threatIndicatorPath,
  threatLanguage,
  threatMapping,
  threatQuery,
  tuple,
  type,
  wrapHits,
}: CreateThreatSignalsOptions): Promise<SearchAfterAndBulkCreateReturnType> => {
  const params = completeRule.ruleParams;
  logger.debug(buildRuleMessage('Indicator matching rule starting'));
  const perPage = concurrentSearches * itemsPerSearch;
  const verifyExecutionCanProceed = buildExecutionIntervalValidator(
    completeRule.ruleConfig.schedule.interval
  );

  let results: SearchAfterAndBulkCreateReturnType = {
    success: true,
    warning: false,
    bulkCreateTimes: [],
    searchAfterTimes: [],
    lastLookBackDate: null,
    createdSignalsCount: 0,
    createdSignals: [],
    errors: [],
    warningMessages: [],
  };

  let threatListCount = await getThreatListCount({
    esClient: services.scopedClusterClient.asCurrentUser,
    exceptionItems,
    threatFilters,
    query: threatQuery,
    language: threatLanguage,
    index: threatIndex,
  });
  logger.debug(buildRuleMessage(`Total indicator items: ${threatListCount}`));

  let threatList = await getThreatList({
    esClient: services.scopedClusterClient.asCurrentUser,
    exceptionItems,
    threatFilters,
    query: threatQuery,
    language: threatLanguage,
    index: threatIndex,
    listClient,
    searchAfter: undefined,
    sortField: undefined,
    sortOrder: undefined,
    logger,
    buildRuleMessage,
    perPage,
  });

  const threatEnrichment = buildThreatEnrichment({
    buildRuleMessage,
    exceptionItems,
    listClient,
    logger,
    services,
    threatFilters,
    threatIndex,
    threatIndicatorPath,
    threatLanguage,
    threatQuery,
  });

  while (threatList.hits.hits.length !== 0) {
    verifyExecutionCanProceed();
    const chunks = chunk(itemsPerSearch, threatList.hits.hits);
    logger.debug(buildRuleMessage(`${chunks.length} concurrent indicator searches are starting.`));
    const concurrentSearchesPerformed = chunks.map<Promise<SearchAfterAndBulkCreateReturnType>>(
      (slicedChunk) =>
        createThreatSignal({
          alertId,
          buildRuleMessage,
          bulkCreate,
          completeRule,
          currentResult: results,
          currentThreatList: slicedChunk,
          eventsTelemetry,
          exceptionItems,
          filters,
          inputIndex,
          language,
          listClient,
          logger,
          outputIndex,
          query,
          savedId,
          searchAfterSize,
          services,
          threatEnrichment,
          threatMapping,
          tuple,
          type,
          wrapHits,
        })
    );
    const searchesPerformed = await Promise.all(concurrentSearchesPerformed);
    results = combineConcurrentResults(results, searchesPerformed);
    threatListCount -= threatList.hits.hits.length;
    logger.debug(
      buildRuleMessage(
        `Concurrent indicator match searches completed with ${results.createdSignalsCount} signals found`,
        `search times of ${results.searchAfterTimes}ms,`,
        `bulk create times ${results.bulkCreateTimes}ms,`,
        `all successes are ${results.success}`
      )
    );
    if (results.createdSignalsCount >= params.maxSignals) {
      logger.debug(
        buildRuleMessage(
          `Indicator match has reached its max signals count ${params.maxSignals}. Additional indicator items not checked are ${threatListCount}`
        )
      );
      break;
    }
    logger.debug(buildRuleMessage(`Indicator items left to check are ${threatListCount}`));

    threatList = await getThreatList({
      esClient: services.scopedClusterClient.asCurrentUser,
      exceptionItems,
      query: threatQuery,
      language: threatLanguage,
      threatFilters,
      index: threatIndex,
      // @ts-expect-error@elastic/elasticsearch SortResults might contain null
      searchAfter: threatList.hits.hits[threatList.hits.hits.length - 1].sort,
      sortField: undefined,
      sortOrder: undefined,
      listClient,
      buildRuleMessage,
      logger,
      perPage,
    });
  }

  logger.debug(buildRuleMessage('Indicator matching rule has completed'));
  return results;
};
