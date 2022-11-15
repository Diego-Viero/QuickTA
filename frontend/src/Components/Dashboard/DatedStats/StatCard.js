import {
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText,
    StatArrow,
  } from '@chakra-ui/react'

const StatCard = ({title, num, delta, unit}) => {
    const cardStyle = {backgroundColor: 'white', boxShadow: '1px 2px 3px 1px rgba(0,0,0,0.12)', borderRadius: '15px', padding: '10px'};
    const titleStyle = {fontSize: '16px', fontWeight: '700', lineHeight: '0px'};

    return (
        <Stat style = {cardStyle}>
        <StatNumber><span style={titleStyle}>{title}</span></StatNumber>
        <StatLabel>{num}{unit}</StatLabel>
        {(delta >= 0) ? (
            <StatHelpText>
            <StatArrow type='increase' />
            {delta}% from previous delta
            </StatHelpText>
        ) : (
            <StatHelpText>
            <StatArrow type='decrease' />
            {delta * -1}% from previous delta
            </StatHelpText>
        )}
      </Stat>
    );
}

export default StatCard;