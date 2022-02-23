// Pages
import { Thoughts } from '../pages/thoughts'
import { Experiments } from '../pages/experiments'
import { About } from '../pages/about'

export const ROUTES = {
  thoughts: {
    pageName: 'Thoughts',
    linkName: 'Thoughts',
    path: '/thoughts',
    element: Thoughts,
  },
  experiments: {
    pageName: 'Experiments',
    linkName: 'Experiments',
    path: '/experiments',
    element: Experiments,
  },
  about: {
    pageName: 'Me',
    linkName: 'About',
    path: '/about',
    element: About,
  },
}
export const ROUTE_LIST = [
  ROUTES.thoughts,
  ROUTES.experiments,
  ROUTES.about
]
export const ROUTE_DEFAULT = ROUTES.thoughts
