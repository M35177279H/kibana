/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
// @ts-ignore
import { euiPaletteColorBlind } from '@elastic/eui/lib/services';
import { Position, Fit } from '@elastic/charts';

import { AggGroupNames } from '../../../../data/public';
import { VIS_EVENT_TO_TRIGGER } from '../../../../visualizations/public';
import { defaultCountLabel, LabelRotation } from '../../../../charts/public';

import {
  ChartMode,
  AxisType,
  ScaleType,
  AxisMode,
  ThresholdLineStyle,
  InterpolationMode,
} from '../types';
import { toExpressionAst } from '../to_ast';
import { ChartType } from '../../common';
import { optionTabs } from '../editor/common_config';
import { getVisTypeFromParams } from './get_vis_type_from_params';

export const lineVisTypeDefinition = {
  name: 'line',
  title: i18n.translate('visTypeXy.line.lineTitle', { defaultMessage: 'Line' }),
  icon: 'visLine',
  description: i18n.translate('visTypeXy.line.lineDescription', {
    defaultMessage: 'Display data as a series of points.',
  }),
  toExpressionAst,
  getSupportedTriggers: () => [VIS_EVENT_TO_TRIGGER.filter, VIS_EVENT_TO_TRIGGER.brush],
  updateVisTypeOnParamsChange: getVisTypeFromParams,
  visConfig: {
    defaults: {
      type: ChartType.Line,
      grid: {
        categoryLines: false,
      },
      categoryAxes: [
        {
          id: 'CategoryAxis-1',
          type: AxisType.Category,
          position: Position.Bottom,
          show: true,
          scale: {
            type: ScaleType.Linear,
          },
          labels: {
            show: true,
            filter: true,
            truncate: 100,
          },
          title: {},
          style: {},
        },
      ],
      valueAxes: [
        {
          id: 'ValueAxis-1',
          name: 'LeftAxis-1',
          type: AxisType.Value,
          position: Position.Left,
          show: true,
          scale: {
            type: ScaleType.Linear,
            mode: AxisMode.Normal,
          },
          labels: {
            show: true,
            rotate: LabelRotation.Horizontal,
            filter: true,
            truncate: 100,
          },
          title: {
            text: '',
          },
          style: {},
        },
      ],
      seriesParams: [
        {
          show: true,
          type: ChartType.Line,
          mode: ChartMode.Normal,
          data: {
            label: defaultCountLabel,
            id: '1',
          },
          valueAxis: 'ValueAxis-1',
          drawLinesBetweenPoints: true,
          lineWidth: 2,
          interpolate: InterpolationMode.Linear,
          showCircles: true,
          circlesRadius: 1,
        },
      ],
      addTooltip: true,
      detailedTooltip: true,
      palette: {
        type: 'palette',
        name: 'default',
      },
      addLegend: true,
      legendPosition: Position.Right,
      fittingFunction: Fit.Linear,
      times: [],
      addTimeMarker: false,
      truncateLegend: true,
      maxLegendLines: 1,
      labels: {},
      radiusRatio: 9,
      thresholdLine: {
        show: false,
        value: 10,
        width: 1,
        style: ThresholdLineStyle.Full,
        color: euiPaletteColorBlind()[9],
      },
    },
  },
  editorConfig: {
    optionTabs,
    schemas: [
      {
        group: AggGroupNames.Metrics,
        name: 'metric',
        title: i18n.translate('visTypeXy.line.metricTitle', { defaultMessage: 'Y-axis' }),
        min: 1,
        aggFilter: ['!geo_centroid', '!geo_bounds', '!filtered_metric', '!single_percentile'],
        defaults: [{ schema: 'metric', type: 'count' }],
      },
      {
        group: AggGroupNames.Metrics,
        name: 'radius',
        title: i18n.translate('visTypeXy.line.radiusTitle', { defaultMessage: 'Dot size' }),
        min: 0,
        max: 1,
        aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality', 'top_hits'],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'segment',
        title: i18n.translate('visTypeXy.line.segmentTitle', { defaultMessage: 'X-axis' }),
        min: 0,
        max: 1,
        aggFilter: [
          '!geohash_grid',
          '!geotile_grid',
          '!filter',
          '!sampler',
          '!diversified_sampler',
          '!multi_terms',
          '!significant_text',
        ],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'group',
        title: i18n.translate('visTypeXy.line.groupTitle', {
          defaultMessage: 'Split series',
        }),
        min: 0,
        max: 3,
        aggFilter: [
          '!geohash_grid',
          '!geotile_grid',
          '!filter',
          '!sampler',
          '!diversified_sampler',
          '!multi_terms',
          '!significant_text',
        ],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'split',
        title: i18n.translate('visTypeXy.line.splitTitle', {
          defaultMessage: 'Split chart',
        }),
        min: 0,
        max: 1,
        aggFilter: [
          '!geohash_grid',
          '!geotile_grid',
          '!filter',
          '!sampler',
          '!diversified_sampler',
          '!multi_terms',
          '!significant_text',
        ],
      },
    ],
  },
  requiresSearch: true,
};
