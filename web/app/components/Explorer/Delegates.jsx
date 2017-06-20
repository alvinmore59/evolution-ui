import React from "react";
import Immutable from "immutable";
import AccountImage from "../Account/AccountImage";
import ChainTypes from "../Utility/ChainTypes";
import BindToChainState from "../Utility/BindToChainState";
import {ChainStore} from "evolution-js/es";
import FormattedAsset from "../Utility/FormattedAsset";
import Translate from "react-translate-component";
import TimeAgo from "../Utility/TimeAgo";
import { connect } from "alt-react";
import SettingsActions from "actions/SettingsActions";
import SettingsStore from "stores/SettingsStore";
import classNames from "classnames";

require("./delegates.scss");

class DelegateCard extends React.Component {

    static propTypes = {
        delegate: ChainTypes.ChainAccount.isRequired
    }

    static contextTypes = {
        router: React.PropTypes.object.isRequired
    }

    _onCardClick(e) {
        e.preventDefault();
        this.context.router.push(`/account/${this.props.delegate.get("name")}`);
    }

    render() {
        let delegate_data = ChainStore.getDelegateById( this.props.delegate.get('id') )
        if ( !delegate_data ) return null;
        let total_votes = delegate_data.get( "total_votes" );

        let delegate_aslot = delegate_data.get('last_aslot')
        let color = {};
        if( this.props.most_recent - delegate_aslot > 100 ) {
           color = {borderLeft: "1px solid #FCAB53"};
        }
        else {
           color = {borderLeft: "1px solid #50D2C2"};
        }
        let last_aslot_time = new Date(Date.now() - ((this.props.most_recent - delegate_aslot ) * ChainStore.getObject( "2.0.0" ).getIn( ["parameters","block_interval"] )*1000));

        return (
            <div className="grid-content account-card" onClick={this._onCardClick.bind(this)}>
                <div className="card" style={color}>
                    <h4 className="text-center">#{this.props.rank}: {this.props.delegate.get('name')}</h4>
                    <div className="card-content">
                        <div className="text-center">
                            <AccountImage account={this.props.delegate.get('name')} size={{height: 64, width: 64}}/>
                        </div>
                        <br/>
                        <table className="table key-value-table">
                            <tbody>
                                <tr>
                                    <td>Votes</td>
                                    <td><FormattedAsset amount={total_votes} asset="1.3.0" decimalOffset={5} /></td>
                                </tr>
                                <tr>
                                    <td>Last&nbsp;Block</td>
                                    <td><TimeAgo time={new Date(last_aslot_time)} /></td>
                                </tr>
                                <tr>
                                    <td>Missed</td>
                                    <td>{delegate_data.get('total_missed')}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }
}
DelegateCard = BindToChainState(DelegateCard, {keep_updating: true});

class DelegateRow extends React.Component {

    static propTypes = {
        delegate: ChainTypes.ChainAccount.isRequired
    }

    static contextTypes = {
        router: React.PropTypes.object.isRequired
    }

    _onRowClick(e) {
        e.preventDefault();
        this.context.router.push(`/account/${this.props.delegate.get("name")}`);
    }

    // componentWillUnmount() {
    //     ChainStore.unSubFrom("delegates", ChainStore.getDelegateById( this.props.delegate.get("id") ).get("id"));
    // }

    render() {
        let {delegate, isCurrent, rank} = this.props;
        let delegate_data = ChainStore.getDelegateById( this.props.delegate.get('id') );
        if ( !delegate_data ) return null;
        let total_votes = delegate_data.get( "total_votes" );

        let delegate_aslot = delegate_data.get('last_aslot')
        let color = {};
        if( this.props.most_recent - delegate_aslot > 100 ) {
           color = {borderLeft: "1px solid #FCAB53"};
        }
        else {
           color = {borderLeft: "1px solid #50D2C2"};
        }
        let last_aslot_time = new Date(Date.now() - ((this.props.most_recent - delegate_aslot ) * ChainStore.getObject( "2.0.0" ).getIn( ["parameters","block_interval"] )*1000));

        let currentClass = isCurrent ? "active-delegate" : "";

        let missed = delegate_data.get('total_missed');
        let missedClass = classNames("txtlabel",
            {"success": missed <= 500 },
            {"info": missed > 500 && missed <= 1250},
            {"warning": missed > 1250 && missed <= 2000},
            {"error": missed >= 200}
        );

        return (
            <tr className={currentClass} onClick={this._onRowClick.bind(this)} >
                <td>{rank}</td>
                <td style={color}>{delegate.get("name")}</td>
                <td><TimeAgo time={new Date(last_aslot_time)} /></td>
                <td>{delegate_data.get('last_confirmed_block_num')}</td>
                <td className={missedClass}>{missed}</td>
                <td><FormattedAsset amount={delegate_data.get('total_votes')} asset="1.3.0" decimalOffset={5} /></td>
            </tr>
        )
    }
}
DelegateRow = BindToChainState(DelegateRow, {keep_updating: true});

class DelegateList extends React.Component {

    static propTypes = {
        delegates: ChainTypes.ChainObjectsList.isRequired
    }

    constructor () {
        super();
        this.state = {
          sortBy: 'rank',
          inverseSort: true
        };
    }

    _setSort(field) {
        this.setState({
          sortBy: field,
          inverseSort: field === this.state.sortBy ? !this.state.inverseSort : this.state.inverseSort
        });
      }

    render() {

        let {delegates, current, cardView, delegateList} = this.props;
        let {sortBy, inverseSort} = this.state;
        let most_recent_aslot = 0;
        let ranks = {};

        delegates
        .filter(a => {
            if (!a) {
                return false;
            }
            return delegateList.indexOf(a.get("id")) !== -1;
        })
        .sort((a, b) => {
            if (a && b) {
                return parseInt(b.get("total_votes"), 10) - parseInt(a.get("total_votes"), 10);
            }
        })
        .forEach( (w, index) => {
            if (w) {
                let s = w.get("last_aslot");
                if( most_recent_aslot < s ) {
                    most_recent_aslot = s;
                }

                ranks[w.get("id")] = index + 1;
            }
        });

        let itemRows = null;
        if (delegates.length > 0 && delegates[1]) {
            itemRows = delegates
                .filter(a => {
                    if (!a) { return false; }
                    let account = ChainStore.getObject(a.get("delegate_account"));
                    if (!account) return false;
                    let name = account.get("name");
                    if (!name) return false;
                    return name.indexOf(this.props.filter) !== -1;
                })
                .sort((a, b) => {
                    let a_account = ChainStore.getObject(a.get("delegate_account"));
                    let b_account = ChainStore.getObject(b.get("delegate_account"));

                    if (!a_account || !b_account) {
                        return 0;
                    }
                    // console.log("a:", a.toJS());

                    switch (sortBy) {
                        case 'name':
                            if (a_account.get("name") > b_account.get("name")) {
                                return inverseSort ? 1 : -1;
                            } else if (a_account.get("name") < b_account.get("name")) {
                                return inverseSort ? -1 : 1;
                            } else {
                                return 0;
                            }
                            break;

                        case "rank":
                            return !inverseSort ? ranks[b.get("id")] - ranks[a.get("id")] : ranks[a.get("id")] - ranks[b.get("id")];
                            break;

                        default:
                            return !inverseSort ? parseInt(b.get(sortBy), 10) - parseInt(a.get(sortBy), 10) : parseInt(a.get(sortBy), 10) - parseInt(b.get(sortBy), 10);
                    }


                })
                .map((a) => {

                    if (!cardView) {
                        return (
                            <DelegateRow key={a.get("id")} rank={ranks[a.get("id")]} isCurrent={current === a.get("id")}  delegate={a.get("delegate_account")} most_recent={this.props.current_aslot} />
                        );
                    } else {
                        return (
                            <DelegateCard key={a.get("id")} rank={ranks[a.get("id")]} delegate={a.get("delegate_account")} most_recent={this.props.current_aslot} />
                        );
                    }


                });
        }

        // table view
        if (!cardView) {
            return (
                <table className="table table-hover">
                    <thead>
                        <tr>
                            <th className="clickable" onClick={this._setSort.bind(this, 'rank')}><Translate content="explorer.delegates.rank" /></th>
                            <th className="clickable" onClick={this._setSort.bind(this, 'name')}><Translate content="account.votes.name" /></th>
                            <th className="clickable" onClick={this._setSort.bind(this, 'last_aslot')}><Translate content="explorer.blocks.last_block" /></th>
                            <th className="clickable" onClick={this._setSort.bind(this, 'last_confirmed_block_num')}><Translate content="explorer.delegates.last_confirmed" /></th>
                            <th className="clickable" onClick={this._setSort.bind(this, 'total_missed')}><Translate content="explorer.delegates.missed" /></th>
                            <th className="clickable" onClick={this._setSort.bind(this, 'total_votes')}><Translate content="account.votes.votes" /></th>
                        </tr>
                    </thead>
                <tbody>
                    {itemRows}
                </tbody>

            </table>
            )
        }
        else {
            return (
                <div className="grid-block small-up-1 medium-up-2 large-up-3">
                    {itemRows}
                </div>
            );
        }
    }
}
DelegateList = BindToChainState(DelegateList, {keep_updating: true, show_loader: true});

class Delegates extends React.Component {


    static propTypes = {
        globalObject: ChainTypes.ChainObject.isRequired,
        dynGlobalObject: ChainTypes.ChainObject.isRequired
    }

    static defaultProps = {
        globalObject: "2.0.0",
        dynGlobalObject: "2.1.0"
    }

    constructor(props) {
        super(props);

        this.state = {
            filterDelegate: props.filterDelegate || "",
            cardView: props.cardView
        };
    }

    _onFilter(e) {
        e.preventDefault();
        this.setState({filterDelegate: e.target.value.toLowerCase()});

        SettingsActions.changeViewSetting({
            filterDelegate: e.target.value.toLowerCase()
        });
    }

    _toggleView() {
        SettingsActions.changeViewSetting({
            cardView: !this.state.cardView
        });

        this.setState({
            cardView: !this.state.cardView
        });
    }

    render() {
        let { dynGlobalObject, globalObject } = this.props;
        dynGlobalObject = dynGlobalObject.toJS();
        globalObject = globalObject.toJS();

        let current = ChainStore.getObject(dynGlobalObject.current_delegate),
            currentAccount = null;
        if (current) {
            currentAccount = ChainStore.getObject(current.get("delegate_account"));
        }

        return (
            <div className="grid-block">
                <div className="grid-block page-layout">
                    <div className="grid-block vertical small-5 medium-3">
                        <div className="grid-content">
                            <br/>
                            <table className="table key-value-table">
                                <tbody>
                                    <tr>
                                        <td><Translate content="explorer.delegates.current"/></td>
                                        <td>{currentAccount ? currentAccount.get("name") : null}</td>
                                    </tr>
                                    <tr>
                                        <td><Translate content="explorer.blocks.active_delegates"/></td>
                                        <td>{Object.keys(globalObject.active_delegates).length}</td>
                                    </tr>
                                    <tr>
                                        <td><Translate content="explorer.delegates.participation"/></td>
                                        <td>{dynGlobalObject.participation}%</td>
                                    </tr>
                                    <tr>
                                        <td><Translate content="explorer.delegates.pay"/></td>
                                        <td><FormattedAsset amount={globalObject.parameters.delegate_pay_per_block} asset="1.3.0" /></td>
                                    </tr>
                                    <tr>
                                        <td><Translate content="explorer.delegates.budget"/></td>
                                        <td> <FormattedAsset amount={dynGlobalObject.delegate_budget} asset="1.3.0" /></td>
                                    </tr>
                                    <tr>
                                        <td><Translate content="explorer.delegates.next_vote"/></td>
                                        <td> <TimeAgo time={new Date(dynGlobalObject.next_maintenance_time)} /></td>
                                    </tr>
                                    <tr>
                                       <td> <Translate component="h4" content="markets.filter" /> </td>
                                       <td> <input type="text" value={this.state.filterDelegate} onChange={this._onFilter.bind(this)} /> </td>
                                    </tr>
                                </tbody>
                            </table>
                            <div className="view-switcher">
                                <span className="button outline" onClick={this._toggleView.bind(this)}>{!this.state.cardView ? <Translate content="explorer.delegates.card"/> : <Translate content="explorer.delegates.table"/>}</span>
                            </div>
                        </div>
                    </div>
                    <div className="grid-block">
                            <div className="grid-content ">
                                <DelegateList
                                    current_aslot={dynGlobalObject.current_aslot}
                                    current={current ? current.get("id") : null}
                                    delegates={Immutable.List(globalObject.active_delegates)}
                                    delegateList={globalObject.active_delegates}
                                    filter={this.state.filterDelegate}
                                    cardView={this.state.cardView}
                                />
                            </div>
                    </div>
                </div>
            </div>
        );
    }
}
Delegates = BindToChainState(Delegates, {keep_updating: true});

class DelegateStoreWrapper extends React.Component {
    render () {
        return <Delegates {...this.props}/>;
    }
}

DelegateStoreWrapper = connect(DelegateStoreWrapper, {
    listenTo() {
        return [SettingsStore];
    },
    getProps() {
        return {
            cardView: SettingsStore.getState().viewSettings.get("cardView"),
            filterDelegate: SettingsStore.getState().viewSettings.get("filterDelegate")
        };
    }
});

export default DelegateStoreWrapper;
