import React from "react";
/** @jsxRuntime classic */
/** @jsx jsx */
import { jsx } from "@emotion/core";
import PropTypes from "prop-types";
import { CometChat } from "@cometchat-pro/chat";

import { CometChatBackdrop } from "../../../Shared";
import { CometChatCreatePollOptions } from "../";

import { CometChatContext } from "../../../../util/CometChatContext";
import * as enums from "../../../../util/enums.js"; 
import Translator from "../../../../resources/localization/translator";

import {
    modalWrapperStyle,
    modalCloseStyle,
    modalBodyStyle,
    modalErrorStyle,
    modalTableStyle,
    tableCaptionStyle,
    tableBodyStyle,
    tableFootStyle,
    iconWrapperStyle,
    addOptionIconStyle
} from "./style";

import creatingIcon from "./resources/creating.svg";
import addIcon from "./resources/add.png";
import clearIcon from "./resources/close.png";

class CometChatCreatePoll extends React.Component {

    loggedInUser = null;
    static contextType = CometChatContext;

    constructor(props) {

        super(props);
        this.state = {
            errorMessage: "",
            options: [],
            creatingPoll: false
        }

        this.questionRef = React.createRef();
        this.optionOneRef = React.createRef();
        this.optionTwoRef = React.createRef();
        this.optionRef = React.createRef();
    }

    addPollOption = () => {

        const options = [...this.state.options];
        options.push({ value: "", id: new Date().getTime() });
        this.setState({options: options});
    }

    removePollOption = (option) => {

        const options = [...this.state.options];
        const optionKey = options.findIndex(opt => opt.id === option.id);
        if (optionKey > -1) {

            options.splice(optionKey, 1);
            this.setState({ options: options});
        }
    }

    optionChangeHandler = (event, option) => {

        const options = [...this.state.options];
        const optionKey = options.findIndex(opt => opt.id === option.id); 
        if (optionKey > -1) {

            const newOption = { ...option, value: event.target.value}
            options.splice(optionKey, 1, newOption);
            this.setState({ options: options });
        }
    }

    createPoll = () => {

        const question = this.questionRef.current.value.trim();
        const firstOption = this.optionOneRef.current.value.trim();
        const secondOption = this.optionTwoRef.current.value.trim();
        const optionItems = [firstOption, secondOption];

        if (question.length === 0) {

            this.setState({ errorMessage: Translator.translate("INVALID_POLL_QUESTION", this.props.lang) });
            return false;
        }

        if (firstOption.length === 0 || secondOption.length === 0) {

            this.setState({ errorMessage: Translator.translate("INVALID_POLL_OPTION", this.props.lang) });
            return false;
        }

        this.state.options.forEach(function (option) {
            optionItems.push(option.value)
        })

        let receiverId;
        let receiverType = this.context.type;
        if (this.context.type === CometChat.RECEIVER_TYPE.USER) {
            receiverId = this.context.item.uid;
        } else if (this.context.type === CometChat.RECEIVER_TYPE.GROUP) {
            receiverId = this.context.item.guid;
        }
        
        this.setState({ creatingPoll: true, errorMessage: "" });

        CometChat.callExtension('polls', 'POST', 'v2/create', {
            "question": question,
            "options": optionItems,
            "receiver": receiverId,
            "receiverType": receiverType
        }).then(response => {

            if (response && response.hasOwnProperty("success") && response["success"] === true) {

                this.setState({ creatingPoll: false });
                this.props.actionGenerated(enums.ACTIONS["POLL_CREATED"]);

            } else {
                this.setState({ errorMessage: Translator.translate("SOMETHING_WRONG", this.props.lang) });
            }

        }).catch(error => {

            this.setState({ creatingPoll: false });
            this.setState({ errorMessage: Translator.translate("SOMETHING_WRONG", this.props.lang) });
        });
    }

    render() {

        const optionList = [...this.state.options];
        const pollOptionView = optionList.map((option, index) => {
            return (
                <CometChatCreatePollOptions 
                key={index} 
                option={option} 
                tabIndex={index+4}
                lang={this.props.lang}
                optionChangeHandler={this.optionChangeHandler}
                removePollOption={this.removePollOption} />
            );
        });

        const createText = (this.state.creatingPoll) ? Translator.translate("CREATING", this.props.lang) : Translator.translate("CREATE", this.props.lang);
        return (
            <React.Fragment>
                <CometChatBackdrop show={true} clicked={this.props.close} />
                <div css={modalWrapperStyle(this.props)} className="modal__createpoll">
                    <span css={modalCloseStyle(clearIcon)} className="modal__close" onClick={this.props.close} title={Translator.translate("CLOSE", this.props.lang)}></span>
                    <div css={modalBodyStyle()} className="modal__body">
                        <table css={modalTableStyle(this.props)}>
                            <caption css={tableCaptionStyle()} className="modal__title">{Translator.translate("CREATE_POLL", this.props.lang)}</caption>
                            <tbody css={tableBodyStyle()}>
                                <tr className="error">
                                    <td colSpan="3"><div css={modalErrorStyle(this.context)}>{this.state.errorMessage}</div></td>
                                </tr>
                                <tr className="poll__question">
                                    <td><label>{Translator.translate("QUESTION", this.props.lang)}</label></td>
                                    <td colSpan="2">
                                        <input type="text" autoFocus tabIndex="1" placeholder={Translator.translate("ENTER_YOUR_QUESTION", this.props.lang)} ref={this.questionRef} />
                                    </td>
                                </tr>
                                <tr className="poll__options">
                                    <td>
                                        <label>{Translator.translate("OPTIONS", this.props.lang)}</label>
                                    </td>
                                    <td colSpan="2">
                                        <input type="text" tabIndex="2" placeholder={Translator.translate("ENTER_YOUR_OPTION", this.props.lang)} ref={this.optionOneRef} />
                                    </td>
                                </tr>
                                <tr ref={this.optionRef} className="poll__options">
                                    <td>&nbsp;</td>
                                    <td colSpan="2">
                                        <input type="text" tabIndex="3" placeholder={Translator.translate("ENTER_YOUR_OPTION", this.props.lang)} ref={this.optionTwoRef} />
                                    </td>
                                </tr>
                                {pollOptionView}
                                <tr>
                                    <td>&nbsp;</td>
                                    <td>
                                        <label>{Translator.translate("ADD_NEW_OPTION", this.props.lang)}</label>
                                    </td>
                                    <td css={iconWrapperStyle()}>
                                        <span tabIndex="100" css={addOptionIconStyle(addIcon)} className="option__add" onClick={this.addPollOption}></span>
                                    </td>
                                </tr>
                            </tbody>
                            <tfoot css={tableFootStyle(this.props, this.state, creatingIcon)}>
                                <tr className="createpoll">
                                    <td colSpan="2">
                                        <button type="button" onClick={this.createPoll}>
                                            <span>{createText}</span>
                                        </button>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </React.Fragment>
        );
    }
}

// Specifies the default values for props:
CometChatCreatePoll.defaultProps = {
    lang: Translator.getDefaultLanguage(),
};

CometChatCreatePoll.propTypes = {
    lang: PropTypes.string,
}

export { CometChatCreatePoll };