/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Layout from './components/Layout/Layout';
import PoolDashboard from './components/PoolDashboard';

export default function App() {
  return (
    <Layout>
       <PoolDashboard />
    </Layout>
  );
}


