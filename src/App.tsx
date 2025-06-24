import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { chatbubbles, analytics, settings } from 'ionicons/icons';
import SMSDashboard from './pages/SMSDashboard';
import WebhookMonitor from './pages/WebhookMonitor';
import Settings from './pages/Settings';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
// import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact(
  {
    mode: 'ios'
  }
);

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <IonTabs>
        <IonRouterOutlet>
          {/* @ts-ignore */}
          <Route exact path="/sms-dashboard">
            <SMSDashboard />
          </Route>
          {/* @ts-ignore */}
          <Route exact path="/webhook-monitor">
            <WebhookMonitor />
          </Route>
          {/* @ts-ignore */}
          <Route path="/settings">
            <Settings />
          </Route>
          {/* @ts-ignore */}
          <Route exact path="/">
            {/* @ts-ignore */}
            <Redirect to="/sms-dashboard" />
          </Route>
        </IonRouterOutlet>
        <IonTabBar slot="bottom">
          <IonTabButton tab="sms-dashboard" href="/sms-dashboard">
            <IonIcon aria-hidden="true" icon={chatbubbles} />
            <IonLabel>Dashboard</IonLabel>
          </IonTabButton>
          <IonTabButton tab="webhook-monitor" href="/webhook-monitor">
            <IonIcon aria-hidden="true" icon={analytics} />
            <IonLabel>Messages</IonLabel>
          </IonTabButton>
          <IonTabButton tab="settings" href="/settings">
            <IonIcon aria-hidden="true" icon={settings} />
            <IonLabel>Settings</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </IonReactRouter>
  </IonApp>
);

export default App;
