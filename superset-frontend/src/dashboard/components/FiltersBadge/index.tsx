/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, { useCallback, useMemo } from 'react';
import cx from 'classnames';
import Icon from 'src/components/Icon';
import Icons from 'src/components/Icons';
import { uniqWith } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import DetailsPanelPopover from './DetailsPanel';
import { Pill } from './Styles';
import {
  Indicator,
  IndicatorStatus,
  selectIndicatorsForChart,
  selectNativeIndicatorsForChart,
} from './selectors';
import { setDirectPathToChild } from '../../actions/dashboardState';
import {
  ChartsState,
  DashboardInfo,
  DashboardLayout,
  RootState,
} from '../../types';
import { Filters } from '../../reducers/types';
import { DataMaskStateWithId } from '../../../dataMask/types';

export interface FiltersBadgeProps {
  chartId: number;
}

const sortByStatus = (indicators: Indicator[]): Indicator[] => {
  const statuses = [
    IndicatorStatus.Applied,
    IndicatorStatus.Unset,
    IndicatorStatus.Incompatible,
  ];
  return indicators.sort(
    (a, b) =>
      statuses.indexOf(a.status as IndicatorStatus) -
      statuses.indexOf(b.status as IndicatorStatus),
  );
};

const FiltersBadge = React.memo(({ chartId }: FiltersBadgeProps) => {
  const dispatch = useDispatch();
  const datasources = useSelector<RootState, any>(state => state.datasources);
  const dashboardFilters = useSelector<RootState, any>(
    state => state.dashboardFilters,
  );
  const nativeFilters = useSelector<RootState, Filters>(
    state => state.nativeFilters?.filters,
  );
  const dashboardInfo = useSelector<RootState, DashboardInfo>(
    state => state.dashboardInfo,
  );
  const charts = useSelector<RootState, ChartsState>(state => state.charts);
  const present = useSelector<RootState, DashboardLayout>(
    state => state.dashboardLayout.present,
  );
  const dataMask = useSelector<RootState, DataMaskStateWithId>(
    state => state.dataMask,
  );

  const onHighlightFilterSource = useCallback(
    (path: string[]) => {
      dispatch(setDirectPathToChild(path));
    },
    [dispatch],
  );

  const chart = charts[chartId];
  const dashboardIndicators = useMemo(
    () =>
      selectIndicatorsForChart(chartId, dashboardFilters, datasources, chart),
    [
      chartId,
      JSON.stringify(chart),
      JSON.stringify(dashboardFilters),
      JSON.stringify(datasources),
    ],
  );

  const nativeIndicators = useMemo(
    () =>
      selectNativeIndicatorsForChart(
        nativeFilters,
        dataMask,
        chartId,
        chart,
        present,
        dashboardInfo.metadata?.chart_configuration,
      ),
    [
      chartId,
      JSON.stringify(chart),
      JSON.stringify(dashboardInfo.metadata?.chart_configuration),
      JSON.stringify(dataMask),
      JSON.stringify(nativeFilters),
      JSON.stringify(present),
    ],
  );

  const indicators = useMemo(
    () =>
      uniqWith(
        sortByStatus([...dashboardIndicators, ...nativeIndicators]),
        (ind1, ind2) =>
          ind1.column === ind2.column &&
          ind1.name === ind2.name &&
          (ind1.status !== IndicatorStatus.Applied ||
            ind2.status !== IndicatorStatus.Applied),
      ),
    [dashboardIndicators, nativeIndicators],
  );

  const appliedCrossFilterIndicators = indicators.filter(
    indicator => indicator.status === IndicatorStatus.CrossFilterApplied,
  );
  const appliedIndicators = indicators.filter(
    indicator => indicator.status === IndicatorStatus.Applied,
  );
  const unsetIndicators = indicators.filter(
    indicator => indicator.status === IndicatorStatus.Unset,
  );
  const incompatibleIndicators = indicators.filter(
    indicator => indicator.status === IndicatorStatus.Incompatible,
  );

  if (
    !appliedCrossFilterIndicators.length &&
    !appliedIndicators.length &&
    !incompatibleIndicators.length &&
    !unsetIndicators.length
  ) {
    return null;
  }

  const isInactive =
    !appliedCrossFilterIndicators.length &&
    !appliedIndicators.length &&
    !incompatibleIndicators.length;

  return (
    <DetailsPanelPopover
      appliedCrossFilterIndicators={appliedCrossFilterIndicators}
      appliedIndicators={appliedIndicators}
      unsetIndicators={unsetIndicators}
      incompatibleIndicators={incompatibleIndicators}
      onHighlightFilterSource={onHighlightFilterSource}
    >
      <Pill
        className={cx(
          'filter-counts',
          !!incompatibleIndicators.length && 'has-incompatible-filters',
          !!appliedCrossFilterIndicators.length && 'has-cross-filters',
          isInactive && 'filters-inactive',
        )}
      >
        <Icon name="filter" />
        {!isInactive && (
          <span data-test="applied-filter-count">
            {appliedIndicators.length + appliedCrossFilterIndicators.length}
          </span>
        )}
        {incompatibleIndicators.length ? (
          <>
            {' '}
            <Icons.AlertSolid />
            <span data-test="incompatible-filter-count">
              {incompatibleIndicators.length}
            </span>
          </>
        ) : null}
      </Pill>
    </DetailsPanelPopover>
  );
});

export default FiltersBadge;
