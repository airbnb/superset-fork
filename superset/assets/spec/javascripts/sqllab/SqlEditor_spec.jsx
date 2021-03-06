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
import React from 'react';
import { shallow } from 'enzyme';

import { defaultQueryEditor, initialState, queries, table } from './fixtures';
import LimitControl from '../../../src/SqlLab/components/LimitControl';
import SqlEditor from '../../../src/SqlLab/components/SqlEditor';
import SqlEditorLeftBar from '../../../src/SqlLab/components/SqlEditorLeftBar';

describe('SqlEditor', () => {
  const mockedProps = {
    actions: {},
    database: {},
    queryEditor: initialState.sqlLab.queryEditors[0],
    latestQuery: queries[0],
    tables: [table],
    getHeight: () => ('100px'),
    editorQueries: [],
    dataPreviewQueries: [],
    defaultQueryLimit: 1000,
    maxRow: 100000,
  };

  beforeAll(() => {
    jest.spyOn(SqlEditor.prototype, 'getSqlEditorHeight').mockImplementation(() => 500);
  });

  it('is valid', () => {
    expect(
      React.isValidElement(<SqlEditor {...mockedProps} />),
    ).toBe(true);
  });
  it('render a SqlEditorLeftBar', () => {
    const wrapper = shallow(<SqlEditor {...mockedProps} />);
    expect(wrapper.find(SqlEditorLeftBar)).toHaveLength(1);
  });
  it('render a LimitControl with default limit', () => {
    const defaultQueryLimit = 101;
    const updatedProps = { ...mockedProps, defaultQueryLimit };
    const wrapper = shallow(<SqlEditor {...updatedProps} />);
    expect(wrapper.find(LimitControl)).toHaveLength(1);
    expect(wrapper.find(LimitControl).props().value).toEqual(defaultQueryLimit);
  });
  it('render a LimitControl with existing limit', () => {
    const queryEditor = { ...defaultQueryEditor, queryLimit: 101 };
    const updatedProps = { ...mockedProps, queryEditor };
    const wrapper = shallow(<SqlEditor {...updatedProps} />);
    expect(wrapper.find(LimitControl)).toHaveLength(1);
    expect(wrapper.find(LimitControl).props().value).toEqual(queryEditor.queryLimit);
  });
});
