// ------------------------------------------------------------------------
// ------------------------------------------------------------------------
// AUTOCOMPLETE COMPONENT
// ------------------------------------------------------------------------
// ------------------------------------------------------------------------

const {useState, useRef, useEffect, Component} = React;

function Autocomplete(props){
 
  const [label, setLabel] = useState(props.label || null);
  const [placeholder, setPlaceholder] = useState(props.placeholder || null);
  const [selectedValue, setSelectedValue] = useState(props.value || "");
  const [searchValue, setSearchValue] = useState(props.value || "");
  const searchInputRef = useRef();
  const [activeIndex, setActiveIndex] = useState(0);
  const [focus, setFocus] = useState(false);
  var blurDelay = null
  
  const options = props.options || [];
  
  const updateSelectedValue = (v) => {
    setSelectedValue(v);
    if(typeof props.onChange==="function")
      props.onChange(v);
    return;
  }
  
  // INPUT USER EVENT
  const handleInputFocus = (e) => {
    clearTimeout(blurDelay); // avoid panel close on multiple click on select field
    setFocus(false);
    setSearchValue("");
    setTimeout(() => setFocus(true),10);
  };
  const handleInputChange = (e) => {
    updateSelectedValue(e.target.value);
    setFocus(false);
  };
  
  // SEARCH USER EVENT
  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
    setActiveIndex(0);
  };
  const handleSearchBlur = (e) => {
    blurDelay = setTimeout(() => setFocus(false),100);
  };
  const handleSearchKeyUp = (e) => {
    if(e.keyCode===13) { 
      //RETURN
      setFocus(false);
      let o = filteredOptions()[activeIndex]
      if(o)
      {
        updateSelectedValue(o.value)
      }
    }
    else if(e.keyCode===27) //ESC
      setFocus(false);
    else if(e.keyCode===40) //DOWN
      setActiveIndex(options.length > 0 ? (activeIndex+1)%options.length : 0)
    else if(e.keyCode===38) //UP
      setActiveIndex(options.length > 0 ? (activeIndex-1)%options.length : 0)
  };
  
  const handleOptionSelection = (o) => {
    setFocus(false);
    updateSelectedValue(o.value)
  };
  
  const filteredOptions = () => options.filter((o) => {
    return o.label.toLowerCase().match(searchValue.toLowerCase())
      || o.value.toLowerCase().match(searchValue.toLowerCase())
  });

  useEffect(() => {
    // call on render
    if(focus)
      searchInputRef.current.focus();
  });
  
  return (
    <div className="UI-autocomplete">
      {
        typeof label === "string" && label.length>0 
          ? <label className="UI-autocomplete-label">{label} </label>
          : null
      }
      <div className="UI-autocomplete-input" focus={focus ? 'true':'false'}>
        <select
          onFocus={handleInputFocus}
          onChange={handleInputChange}
          value={selectedValue}
          >
          <option value=""></option>
          {options.map((o,index) => (<option key={index} value={o.value}>{o.label}</option>))}
        </select>
        <ul className="UI-autocomplete-options">
          <li>
            <input type="text" ref={searchInputRef} value={searchValue} placeholder={placeholder}
              onChange={handleSearchChange}
              onKeyUp={handleSearchKeyUp}
              onBlur={handleSearchBlur}
              />
          </li>
          <div className="UI-autocomplete-options-wrapper">
            {filteredOptions().map((o,index) => <li class="UI-autocomplete-option" index={index} active={index==activeIndex ? 'true':'false'} key={index} onClick={() => handleOptionSelection(o)}>{o.label}</li>)}
          </div>
        </ul>
      </div>
    </div>
  )
}

export default Autocomplete;