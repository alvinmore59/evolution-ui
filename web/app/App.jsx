import {ChainStore} from "evolution-js/es";
import {Apis} from "evolution-ws";
import React from "react";
import IntlStore from "stores/IntlStore";
import AccountStore from "stores/AccountStore";
import SettingsStore from "stores/SettingsStore";
import IntlActions from "actions/IntlActions";
import NotificationStore from "stores/NotificationStore";
import intlData from "./components/Utility/intlData";
import alt from "alt-instance";
import { connect, supplyFluxContext } from "alt-react";
import {IntlProvider} from "react-intl";
import SyncError from "./components/SyncError";
import LoadingIndicator from "./components/LoadingIndicator";
import Header from "components/Layout/Header";
import MobileMenu from "components/Layout/MobileMenu";
import ReactTooltip from "react-tooltip";
import NotificationSystem from "react-notification-system";
import TransactionConfirm from "./components/Blockchain/TransactionConfirm";
import WalletUnlockModal from "./components/Wallet/WalletUnlockModal";
import BrowserSupportModal from "./components/Modal/BrowserSupportModal";
import Footer from "./components/Layout/Footer";

class App extends React.Component {

    constructor() {
        super();

        const user_agent = navigator.userAgent.toLowerCase();
        let isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

        let syncFail = ChainStore.subError && (ChainStore.subError.message === "ChainStore sync error, please check your system clock") ? true : false;
        this.state = {
            loading: true,
            synced: ChainStore.subscribed,
            syncFail,
            theme: SettingsStore.getState().settings.get("themes"),
            isMobile: !!(/android|ipad|ios|iphone|windows phone/i.test(user_agent) || isSafari)
        };

        this._rebuildTooltips = this._rebuildTooltips.bind(this);
    }

    componentWillUnmount() {
        NotificationStore.unlisten(this._onNotificationChange);
        SettingsStore.unlisten(this._onSettingsChange);
    }

    componentDidMount() {
        try {
            NotificationStore.listen(this._onNotificationChange.bind(this));
            SettingsStore.listen(this._onSettingsChange.bind(this));


            ChainStore.init().then(() => {
                this.setState({synced: true});
                Promise.all([
                    AccountStore.loadDbData(Apis.instance().chainId)
                ]).then(() => {
                    AccountStore.tryToSetCurrentAccount();
                    this.setState({loading: false});
                }).catch(error => {
                    console.log("[App.jsx] ----- ERROR ----->", error);
                    this.setState({loading: false});
                });
            }).catch(error => {
                console.log("[App.jsx] ----- ChainStore.init error ----->", error);
                let syncFail = ChainStore.subError && (ChainStore.subError.message === "ChainStore sync error, please check your system clock") ? true : false;

                this.setState({loading: false, synced: false, syncFail});
            });
        } catch(e) {
            console.error("e:", e);
        }
        const user_agent = navigator.userAgent.toLowerCase();
        if (!(window.electron || user_agent.indexOf("firefox") > -1 || user_agent.indexOf("chrome") > -1 || user_agent.indexOf("edge") > -1)) {
            this.refs.browser_modal.show();
        }

        this.props.router.listen(this._rebuildTooltips);

        this._rebuildTooltips();
    }

    _rebuildTooltips() {
        ReactTooltip.hide();

        setTimeout(() => {
            if (this.refs.tooltip) {
                this.refs.tooltip.globalRebuild();
            }
        }, 1500);
    }

    /** Usage: NotificationActions.[success,error,warning,info] */
    _onNotificationChange() {
        let notification = NotificationStore.getState().notification;
        if (notification.autoDismiss === void 0) {
            notification.autoDismiss = 10;
        }
        if (this.refs.notificationSystem) this.refs.notificationSystem.addNotification(notification);
    }

    _onSettingsChange() {
        let {settings, viewSettings} = SettingsStore.getState();
        if (settings.get("themes") !== this.state.theme) {
            this.setState({
                theme: settings.get("themes")
            });
        }
    }

    // /** Non-static, used by passing notificationSystem via react Component refs */
    // _addNotification(params) {
    //     console.log("add notification:", this.refs, params);
    //     this.refs.notificationSystem.addNotification(params);
    // }

    render() {
        let {isMobile, theme} = this.state;
        let content = null;

        let showFooter = this.props.location.pathname.indexOf("market") === -1;

        if (this.state.syncFail) {
            content = (
                <SyncError />
            );
        } else if (this.state.loading) {
            content = <div className="grid-frame vertical"><LoadingIndicator /></div>;
        } else if (this.props.location.pathname === "/init-error") {
            content = <div className="grid-frame vertical">{this.props.children}</div>;
        } else {
            content = (
                <div className="grid-frame vertical">
                    <Header/>
                    <MobileMenu isUnlocked={this.state.isUnlocked} id="mobile-menu"/>
                    <div className="grid-block">
                        <div className="grid-block vertical">
                            {this.props.children}
                        </div>
                    </div>
                    {showFooter ? <Footer synced={this.state.synced}/> : null}
                    <ReactTooltip ref="tooltip" place="top" type={theme === "lightTheme" ? "dark" : "light"} effect="solid"/>
                </div>
            );
        }

        return (
            <div style={{backgroundColor: !this.state.theme ? "#2a2a2a" : null}} className={this.state.theme}>
                <div id="content-wrapper">
                    {content}
                    <NotificationSystem
                        ref="notificationSystem"
                        allowHTML={true}
                        style={{
                            Containers: {
                                DefaultStyle: {
                                    width: "425px"
                                }
                            }
                        }}
                    />
                    <TransactionConfirm/>
                    <WalletUnlockModal/>
                    <BrowserSupportModal ref="browser_modal"/>
                </div>
            </div>
        );

    }
}

class RootIntl extends React.Component {
    componentWillMount() {
        IntlActions.switchLocale(this.props.locale);
    }

    render() {
        return (
            <IntlProvider
                locale={this.props.locale.replace(/cn/, "zh")}
                formats={intlData.formats}
                initialNow={Date.now()}
            >
                <App {...this.props}/>
            </IntlProvider>
        );
    }
}

RootIntl = connect(RootIntl, {
    listenTo() {
        return [IntlStore];
    },
    getProps() {
        return {
            locale: IntlStore.getState().currentLocale
        };
    }
});

class Root extends React.Component {
    static childContextTypes = {
        router: React.PropTypes.object,
        location: React.PropTypes.object
    }

    getChildContext() {
        return {
            router: this.props.router,
            location: this.props.location
        };
    }

    render() {
        return <RootIntl {...this.props} />;
    }
}

export default supplyFluxContext(alt)(Root);
