import React from "react";
import ChainTypes from "../Utility/ChainTypes";
import BindToChainState from "../Utility/BindToChainState";
import LinkToAccountById from "./LinkToAccountById";

class LinkToDelegateById extends React.Component {
    static propTypes = {
        delegate: ChainTypes.ChainObject.isRequired
    }

    render() {
        let delegate_account = this.props.delegate.get("delegate_account");
        return <LinkToAccountById account={delegate_account} />;
    }
}
LinkToDelegateById = BindToChainState(LinkToDelegateById);

export default LinkToDelegateById;
