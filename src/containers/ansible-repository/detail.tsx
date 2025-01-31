import { Trans, msg, t } from '@lingui/macro';
import React from 'react';
import {
  ansibleRepositoryCopyAction,
  ansibleRepositoryDeleteAction,
  ansibleRepositoryEditAction,
  ansibleRepositorySyncAction,
} from 'src/actions';
import { AnsibleRepositoryAPI, AnsibleRepositoryType } from 'src/api';
import { PageWithTabs } from 'src/components';
import { Paths, formatPath } from 'src/paths';
import { canViewAnsibleRepositories } from 'src/permissions';
import { parsePulpIDFromURL, repositoryBasePath } from 'src/utilities';
import { lastSyncStatus, lastSynced } from 'src/utilities';
import { RepositoryAccessTab } from './tab-access';
import { CollectionVersionsTab } from './tab-collection-versions';
import { DetailsTab } from './tab-details';
import { RepositoryVersionsTab } from './tab-repository-versions';

const tabs = [
  { id: 'details', name: msg`Details` },
  { id: 'access', name: msg`Access` },
  { id: 'collection-versions', name: msg`Collection versions` },
  { id: 'repository-versions', name: msg`Versions` },
];

const AnsibleRepositoryDetail = PageWithTabs<AnsibleRepositoryType>({
  breadcrumbs: ({ name, tab, params: { repositoryVersion, group } }) =>
    [
      { url: formatPath(Paths.ansibleRepositories), name: t`Repositories` },
      { url: formatPath(Paths.ansibleRepositoryDetail, { name }), name },
      (tab.id === 'repository-versions' && repositoryVersion) ||
      (tab.id === 'access' && group)
        ? {
            url: formatPath(
              Paths.ansibleRepositoryDetail,
              { name },
              { tab: tab.id },
            ),
            name: tab.name,
          }
        : null,
      tab.id === 'repository-versions' && repositoryVersion
        ? { name: t`Version ${repositoryVersion}` }
        : tab.id === 'access' && group
        ? { name: t`Group ${group}` }
        : { name: tab.name },
    ].filter(Boolean),
  condition: canViewAnsibleRepositories,
  displayName: 'AnsibleRepositoryDetail',
  errorTitle: msg`Repository could not be displayed.`,
  headerActions: [
    ansibleRepositoryEditAction,
    ansibleRepositorySyncAction,
    ansibleRepositoryCopyAction,
    ansibleRepositoryDeleteAction,
  ],
  headerDetails: (item) => (
    <>
      {item?.last_sync_task && (
        <p className='hub-m-truncated'>
          <Trans>Last updated from registry {lastSynced(item)}</Trans>{' '}
          {lastSyncStatus(item)}
        </p>
      )}
    </>
  ),
  listUrl: formatPath(Paths.ansibleRepositories),
  query: ({ name }) => {
    return AnsibleRepositoryAPI.list({ name, page_size: 1 })
      .then(({ data: { results } }) => results[0])
      .then((repository) => {
        // using the list api, so an empty array is really a 404
        if (!repository) {
          return Promise.reject({ response: { status: 404 } });
        }

        const err = (val) => (e) => {
          console.error(e);
          return val;
        };

        return Promise.all([
          repositoryBasePath(repository.name, repository.pulp_href).catch(
            err(null),
          ),
          AnsibleRepositoryAPI.myPermissions(
            parsePulpIDFromURL(repository.pulp_href),
          )
            .then(({ data: { permissions } }) => permissions)
            .catch(err([])),
        ]).then(([distroBasePath, my_permissions]) => ({
          ...repository,
          distroBasePath,
          my_permissions,
        }));
      });
  },
  renderTab: (tab, item, actionContext) =>
    ({
      details: <DetailsTab item={item} actionContext={actionContext} />,
      access: <RepositoryAccessTab item={item} actionContext={actionContext} />,
      'collection-versions': (
        <CollectionVersionsTab item={item} actionContext={actionContext} />
      ),
      'repository-versions': (
        <RepositoryVersionsTab item={item} actionContext={actionContext} />
      ),
    })[tab],
  tabs,
  tabUpdateParams: (p) => {
    delete p.repositoryVersion;
    delete p.group;
    return p;
  },
});

export default AnsibleRepositoryDetail;
